//! QPDF wrapper for PDF security operations
//! 
//! Provides cross-platform access to the qpdf binary for:
//! - PDF encryption (password protection)
//! - PDF decryption (unlock)
//! - PDF optimization

use std::path::PathBuf;
use std::process::Command;

/// Find the qpdf executable on the system
pub fn find_qpdf() -> Option<PathBuf> {
    // Try 'which' command first (works on macOS/Linux)
    if let Ok(path) = which::which("qpdf") {
        return Some(path);
    }
    
    // Platform-specific fallback paths
    #[cfg(target_os = "windows")]
    {
        let candidates = [
            r"C:\Program Files\qpdf\bin\qpdf.exe",
            r"C:\Program Files (x86)\qpdf\bin\qpdf.exe",
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
            "/opt/homebrew/bin/qpdf",      // Apple Silicon Homebrew
            "/usr/local/bin/qpdf",          // Intel Homebrew
            "/opt/local/bin/qpdf",          // MacPorts
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
            "/usr/bin/qpdf",
            "/usr/local/bin/qpdf",
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

/// Get qpdf executable path or return error
fn get_qpdf() -> Result<PathBuf, String> {
    find_qpdf().ok_or_else(|| {
        let install_hint = if cfg!(target_os = "macos") {
            "Install with: brew install qpdf"
        } else if cfg!(target_os = "windows") {
            "Download from: https://github.com/qpdf/qpdf/releases"
        } else {
            "Install with: sudo apt install qpdf"
        };
        
        format!("qpdf not found. {}", install_hint)
    })
}

/// Encrypt a PDF with password protection
/// 
/// # Arguments
/// * `input` - Input PDF path
/// * `output` - Output PDF path  
/// * `user_password` - Password to open the PDF
/// * `owner_password` - Password for editing permissions
pub fn encrypt(
    input: &str,
    output: &str,
    user_password: &str,
    owner_password: &str,
) -> Result<(), String> {
    let qpdf = get_qpdf()?;
    
    let status = Command::new(&qpdf)
        .args([
            "--encrypt",
            user_password,
            owner_password,
            "256",  // AES-256 encryption
            "--",
            input,
            output,
        ])
        .status()
        .map_err(|e| format!("Failed to run qpdf: {}", e))?;
    
    if status.success() {
        Ok(())
    } else {
        Err(format!("qpdf encryption failed with exit code: {:?}", status.code()))
    }
}

/// Decrypt a password-protected PDF
/// 
/// # Arguments
/// * `input` - Input (encrypted) PDF path
/// * `output` - Output (decrypted) PDF path
/// * `password` - Password to decrypt
pub fn decrypt(input: &str, output: &str, password: &str) -> Result<(), String> {
    let qpdf = get_qpdf()?;
    
    let status = Command::new(&qpdf)
        .args([
            "--decrypt",
            &format!("--password={}", password),
            input,
            output,
        ])
        .status()
        .map_err(|e| format!("Failed to run qpdf: {}", e))?;
    
    if status.success() {
        Ok(())
    } else {
        Err("Failed to decrypt PDF. Check if the password is correct.".to_string())
    }
}

/// Optimize a PDF (linearize for web, compress streams)
#[allow(dead_code)]
pub fn optimize(input: &str, output: &str) -> Result<(), String> {
    let qpdf = get_qpdf()?;
    
    let status = Command::new(&qpdf)
        .args([
            "--linearize",
            "--compress-streams=y",
            "--object-streams=generate",
            input,
            output,
        ])
        .status()
        .map_err(|e| format!("Failed to run qpdf: {}", e))?;
    
    if status.success() {
        Ok(())
    } else {
        Err(format!("qpdf optimization failed with exit code: {:?}", status.code()))
    }
}

/// Check if a PDF is encrypted
#[allow(dead_code)]
pub fn is_encrypted(input: &str) -> Result<bool, String> {
    let qpdf = get_qpdf()?;
    
    let output = Command::new(&qpdf)
        .args(["--is-encrypted", input])
        .output()
        .map_err(|e| format!("Failed to run qpdf: {}", e))?;
    
    // qpdf --is-encrypted returns 0 if encrypted, 2 if not encrypted
    Ok(output.status.code() == Some(0))
}
