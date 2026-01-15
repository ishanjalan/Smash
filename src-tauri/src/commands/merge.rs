//! PDF Merge operations
//! 
//! Uses Ghostscript or qpdf to merge multiple PDFs into one.

use crate::ghostscript;
use super::utils::{FileResult, get_file_size, validate_pdf};
use std::path::Path;

/// Merge multiple PDFs into a single file
/// 
/// # Arguments
/// * `input_paths` - List of PDF file paths to merge (in order)
/// * `output_path` - Path for the merged output file
/// 
/// # Returns
/// FileResult with output path and size
#[tauri::command]
pub async fn merge_pdfs(
    input_paths: Vec<String>,
    output_path: String,
) -> Result<FileResult, String> {
    // Validate we have at least 2 files
    if input_paths.len() < 2 {
        return Err("At least 2 PDF files are required for merging".to_string());
    }
    
    // Validate all input files
    for path in &input_paths {
        validate_pdf(path)?;
    }
    
    // Validate output path
    let output_dir = Path::new(&output_path).parent();
    if let Some(dir) = output_dir {
        if !dir.exists() && !dir.as_os_str().is_empty() {
            return Err(format!("Output directory does not exist: {}", dir.display()));
        }
    }
    
    // Use Ghostscript to merge
    ghostscript::merge(&input_paths, &output_path)?;
    
    // Get output file size
    let size = get_file_size(&output_path)
        .map_err(|e| format!("Failed to read output file: {}", e))?;
    
    Ok(FileResult {
        output_path,
        size,
    })
}
