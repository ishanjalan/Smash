//! Ghostscript wrapper for PDF operations
//! 
//! Provides cross-platform access to the Ghostscript binary for:
//! - PDF compression with quality presets
//! - PDF merging
//! - Page extraction and splitting
//! - Page count retrieval

use std::path::PathBuf;
use std::process::Command;

/// Find the Ghostscript executable on the system
pub fn find_ghostscript() -> Option<PathBuf> {
    // Try 'which' command first (works on macOS/Linux)
    if let Ok(path) = which::which("gs") {
        return Some(path);
    }
    
    // Platform-specific fallback paths
    #[cfg(target_os = "windows")]
    {
        let candidates = [
            r"C:\Program Files\gs\gs10.04.0\bin\gswin64c.exe",
            r"C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe",
            r"C:\Program Files\gs\gs10.02.0\bin\gswin64c.exe",
            r"C:\Program Files\gs\gs10.01.0\bin\gswin64c.exe",
            r"C:\Program Files\gs\gs10.00.0\bin\gswin64c.exe",
            r"C:\Program Files\gs\gs9.56.1\bin\gswin64c.exe",
            r"C:\Program Files (x86)\gs\gs10.04.0\bin\gswin32c.exe",
        ];
        
        for path in candidates {
            let p = PathBuf::from(path);
            if p.exists() {
                return Some(p);
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        let candidates = [
            "/opt/homebrew/bin/gs",      // Apple Silicon Homebrew
            "/usr/local/bin/gs",          // Intel Homebrew
            "/opt/local/bin/gs",          // MacPorts
        ];
        
        for path in candidates {
            let p = PathBuf::from(path);
            if p.exists() {
                return Some(p);
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let candidates = [
            "/usr/bin/gs",
            "/usr/local/bin/gs",
        ];
        
        for path in candidates {
            let p = PathBuf::from(path);
            if p.exists() {
                return Some(p);
            }
        }
    }
    
    None
}

/// Get Ghostscript executable path or return error
fn get_gs() -> Result<PathBuf, String> {
    find_ghostscript().ok_or_else(|| {
        let install_hint = if cfg!(target_os = "macos") {
            "Install with: brew install ghostscript"
        } else if cfg!(target_os = "windows") {
            "Download from: https://ghostscript.com/releases/gsdnld.html"
        } else {
            "Install with: sudo apt install ghostscript"
        };
        
        format!("Ghostscript not found. {}", install_hint)
    })
}

/// Get Ghostscript version
pub fn get_version() -> Result<String, String> {
    let gs = get_gs()?;
    
    let output = Command::new(&gs)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to run Ghostscript: {}", e))?;
    
    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(version)
    } else {
        Err("Failed to get Ghostscript version".to_string())
    }
}

/// Compress a PDF using Ghostscript
/// 
/// # Arguments
/// * `input` - Input PDF path
/// * `output` - Output PDF path
/// * `preset` - Quality preset: "screen", "ebook", "printer", "prepress"
pub fn compress(input: &str, output: &str, preset: &str) -> Result<(), String> {
    let gs = get_gs()?;
    
    let status = Command::new(&gs)
        .args([
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            &format!("-dPDFSETTINGS=/{}", preset),
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            "-dDetectDuplicateImages=true",
            "-dCompressFonts=true",
            "-dSubsetFonts=true",
            &format!("-sOutputFile={}", output),
            input,
        ])
        .status()
        .map_err(|e| format!("Failed to run Ghostscript: {}", e))?;
    
    if status.success() {
        Ok(())
    } else {
        Err(format!("Ghostscript compression failed with exit code: {:?}", status.code()))
    }
}

/// Merge multiple PDFs into one
pub fn merge(inputs: &[String], output: &str) -> Result<(), String> {
    let gs = get_gs()?;
    
    let mut args = vec![
        "-sDEVICE=pdfwrite".to_string(),
        "-dNOPAUSE".to_string(),
        "-dQUIET".to_string(),
        "-dBATCH".to_string(),
        format!("-sOutputFile={}", output),
    ];
    
    // Add all input files
    args.extend(inputs.iter().cloned());
    
    let status = Command::new(&gs)
        .args(&args)
        .status()
        .map_err(|e| format!("Failed to run Ghostscript: {}", e))?;
    
    if status.success() {
        Ok(())
    } else {
        Err(format!("Ghostscript merge failed with exit code: {:?}", status.code()))
    }
}

/// Get the page count of a PDF
pub fn get_page_count(input: &str) -> Result<u32, String> {
    let gs = get_gs()?;
    
    let output = Command::new(&gs)
        .args([
            "-q",
            "-dNODISPLAY",
            "-dNOSAFER",
            &format!("-c ({}) (r) file runpdfbegin pdfpagecount = quit", input),
        ])
        .output()
        .map_err(|e| format!("Failed to run Ghostscript: {}", e))?;
    
    if output.status.success() {
        let count_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        count_str
            .parse::<u32>()
            .map_err(|_| format!("Failed to parse page count: {}", count_str))
    } else {
        // Fallback: try alternative method
        get_page_count_alternative(input)
    }
}

/// Alternative method to get page count using pdfinfo-style query
fn get_page_count_alternative(input: &str) -> Result<u32, String> {
    let gs = get_gs()?;
    
    // Use PostScript to count pages
    let ps_code = format!(
        "({}) (r) file runpdfbegin pdfpagecount = quit",
        input.replace('\\', "/").replace('(', "\\(").replace(')', "\\)")
    );
    
    let output = Command::new(&gs)
        .args([
            "-q",
            "-dNODISPLAY",
            "-dBATCH",
            "-dNOPAUSE",
            "-c",
            &ps_code,
        ])
        .output()
        .map_err(|e| format!("Failed to run Ghostscript: {}", e))?;
    
    if output.status.success() {
        let count_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        count_str
            .lines()
            .last()
            .unwrap_or(&count_str)
            .trim()
            .parse::<u32>()
            .map_err(|_| format!("Failed to parse page count from: {}", count_str))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to get page count: {}", stderr))
    }
}

/// Extract a range of pages from a PDF
pub fn extract_pages(input: &str, output: &str, start: u32, end: u32) -> Result<(), String> {
    let gs = get_gs()?;
    
    let status = Command::new(&gs)
        .args([
            "-sDEVICE=pdfwrite",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            &format!("-dFirstPage={}", start),
            &format!("-dLastPage={}", end),
            &format!("-sOutputFile={}", output),
            input,
        ])
        .status()
        .map_err(|e| format!("Failed to run Ghostscript: {}", e))?;
    
    if status.success() {
        Ok(())
    } else {
        Err(format!("Failed to extract pages {}-{}", start, end))
    }
}

/// Extract specific pages from a PDF (non-contiguous)
pub fn extract_page_list(input: &str, output: &str, pages: &[u32]) -> Result<(), String> {
    let gs = get_gs()?;
    
    // For non-contiguous pages, we need to use a more complex approach
    // Create a PostScript command to select specific pages
    let page_list: Vec<String> = pages.iter().map(|p| p.to_string()).collect();
    let pages_str = page_list.join(",");
    
    // Use pdfseparate-like approach with Ghostscript
    // For simplicity, extract each page and merge them
    let temp_dir = tempfile::tempdir()
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let mut temp_files = Vec::new();
    
    for &page in pages {
        let temp_path = temp_dir.path().join(format!("page_{}.pdf", page));
        let temp_str = temp_path.to_string_lossy().to_string();
        
        extract_pages(input, &temp_str, page, page)?;
        temp_files.push(temp_str);
    }
    
    // Merge all extracted pages
    if temp_files.len() == 1 {
        std::fs::copy(&temp_files[0], output)
            .map_err(|e| format!("Failed to copy output: {}", e))?;
    } else {
        merge(&temp_files, output)?;
    }
    
    Ok(())
}
