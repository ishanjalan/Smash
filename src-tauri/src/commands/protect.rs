//! PDF Password Protection
//! 
//! Add or remove password protection from PDFs using qpdf or Ghostscript.

use crate::qpdf;
use super::utils::{FileResult, get_file_size, generate_output_path, validate_pdf};

/// Add password protection to a PDF
/// 
/// # Arguments
/// * `input_path` - Path to the input PDF file
/// * `output_path` - Optional output path (auto-generated if not provided)
/// * `user_password` - Password required to open the PDF
/// * `owner_password` - Optional owner password (defaults to user_password)
/// 
/// # Returns
/// FileResult with output path and size
#[tauri::command]
pub async fn protect_pdf(
    input_path: String,
    output_path: Option<String>,
    user_password: String,
    owner_password: Option<String>,
) -> Result<FileResult, String> {
    // Validate input
    validate_pdf(&input_path)?;
    
    if user_password.is_empty() {
        return Err("Password cannot be empty".to_string());
    }
    
    // Generate output path if not provided
    let output = output_path.unwrap_or_else(|| generate_output_path(&input_path, "-protected"));
    
    // Use owner password if provided, otherwise use user password
    let owner_pwd = owner_password.unwrap_or_else(|| user_password.clone());
    
    // Encrypt the PDF
    qpdf::encrypt(&input_path, &output, &user_password, &owner_pwd)?;
    
    // Get output file size
    let size = get_file_size(&output)
        .map_err(|e| format!("Failed to read output file: {}", e))?;
    
    Ok(FileResult {
        output_path: output,
        size,
    })
}

/// Remove password protection from a PDF
/// 
/// # Arguments
/// * `input_path` - Path to the encrypted PDF file
/// * `output_path` - Optional output path (auto-generated if not provided)
/// * `password` - Password to decrypt the PDF
/// 
/// # Returns
/// FileResult with output path and size
#[tauri::command]
pub async fn unlock_pdf(
    input_path: String,
    output_path: Option<String>,
    password: String,
) -> Result<FileResult, String> {
    // Validate input
    validate_pdf(&input_path)?;
    
    // Generate output path if not provided
    let output = output_path.unwrap_or_else(|| generate_output_path(&input_path, "-unlocked"));
    
    // Decrypt the PDF
    qpdf::decrypt(&input_path, &output, &password)?;
    
    // Get output file size
    let size = get_file_size(&output)
        .map_err(|e| format!("Failed to read output file: {}", e))?;
    
    Ok(FileResult {
        output_path: output,
        size,
    })
}

/// Check if qpdf is available on the system
#[tauri::command]
pub async fn check_qpdf() -> Result<String, String> {
    match qpdf::find_qpdf() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("qpdf not found. Please install qpdf for password protection features.".to_string()),
    }
}
