//! Tauri commands for PDF operations
//! 
//! All PDF processing happens locally - files never leave the device.

pub mod compress;
pub mod merge;
pub mod split;
pub mod protect;
pub mod utils;

pub use compress::*;
pub use merge::*;
pub use split::*;
pub use protect::*;
