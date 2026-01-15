//! Smash - Privacy-First PDF Tools
//! 
//! A native desktop application for PDF processing.
//! All operations happen locally - files never leave your device.

mod commands;
mod ghostscript;
mod qpdf;

use commands::{
    compress_pdf, check_ghostscript, get_ghostscript_version,
    merge_pdfs,
    split_pdf, get_pdf_page_count,
    protect_pdf, unlock_pdf, check_qpdf,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Compression
            compress_pdf,
            check_ghostscript,
            get_ghostscript_version,
            // Merge
            merge_pdfs,
            // Split
            split_pdf,
            get_pdf_page_count,
            // Protection
            protect_pdf,
            unlock_pdf,
            check_qpdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
