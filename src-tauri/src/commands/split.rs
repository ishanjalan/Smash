//! PDF Split operations
//! 
//! Split PDFs by page range, extract specific pages, or split every N pages.

use crate::ghostscript;
use super::utils::{SplitResult, SplitOptions, get_file_size, validate_pdf};
use std::path::Path;

/// Split a PDF into multiple files
/// 
/// # Arguments
/// * `input_path` - Path to the input PDF file
/// * `output_dir` - Directory to save output files
/// * `options` - Split options (mode, range, pages, etc.)
/// 
/// # Returns
/// SplitResult with output paths and total pages
#[tauri::command]
pub async fn split_pdf(
    input_path: String,
    output_dir: String,
    options: SplitOptions,
) -> Result<SplitResult, String> {
    // Validate input
    validate_pdf(&input_path)?;
    
    // Ensure output directory exists
    let out_dir = Path::new(&output_dir);
    if !out_dir.exists() {
        std::fs::create_dir_all(out_dir)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }
    
    // Get total page count
    let total_pages = ghostscript::get_page_count(&input_path)?;
    
    // Generate base name for output files
    let input_stem = Path::new(&input_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    
    let mut output_paths = Vec::new();
    
    match options.mode.as_str() {
        "range" => {
            // Extract a range of pages as a single file
            let start = options.range_start.unwrap_or(1);
            let end = options.range_end.unwrap_or(total_pages);
            
            if start > end || start < 1 || end > total_pages {
                return Err(format!(
                    "Invalid page range {}-{}. PDF has {} pages.",
                    start, end, total_pages
                ));
            }
            
            let output_path = out_dir
                .join(format!("{}_pages_{}-{}.pdf", input_stem, start, end))
                .to_string_lossy()
                .to_string();
            
            ghostscript::extract_pages(&input_path, &output_path, start, end)?;
            output_paths.push(output_path);
        }
        
        "extract" => {
            // Extract specific pages as a single file
            let pages = options.pages.ok_or("Pages list required for extract mode")?;
            
            if pages.is_empty() {
                return Err("No pages specified".to_string());
            }
            
            // Validate page numbers
            for &page in &pages {
                if page < 1 || page > total_pages {
                    return Err(format!(
                        "Invalid page number {}. PDF has {} pages.",
                        page, total_pages
                    ));
                }
            }
            
            let pages_str = if pages.len() <= 3 {
                pages.iter().map(|p| p.to_string()).collect::<Vec<_>>().join("-")
            } else {
                format!("{}-pages", pages.len())
            };
            
            let output_path = out_dir
                .join(format!("{}_{}.pdf", input_stem, pages_str))
                .to_string_lossy()
                .to_string();
            
            ghostscript::extract_page_list(&input_path, &output_path, &pages)?;
            output_paths.push(output_path);
        }
        
        "every-n" => {
            // Split into chunks of N pages
            let n = options.every_n.unwrap_or(1);
            
            if n < 1 {
                return Err("every_n must be at least 1".to_string());
            }
            
            let mut part = 1;
            let mut start = 1;
            
            while start <= total_pages {
                let end = std::cmp::min(start + n - 1, total_pages);
                
                let output_path = out_dir
                    .join(format!("{}_part{}.pdf", input_stem, part))
                    .to_string_lossy()
                    .to_string();
                
                ghostscript::extract_pages(&input_path, &output_path, start, end)?;
                output_paths.push(output_path);
                
                start = end + 1;
                part += 1;
            }
        }
        
        _ => {
            return Err(format!(
                "Invalid split mode '{}'. Valid options: range, extract, every-n",
                options.mode
            ));
        }
    }
    
    Ok(SplitResult {
        output_paths,
        total_pages,
    })
}

/// Get the page count of a PDF
#[tauri::command]
pub async fn get_pdf_page_count(input_path: String) -> Result<u32, String> {
    validate_pdf(&input_path)?;
    ghostscript::get_page_count(&input_path)
}
