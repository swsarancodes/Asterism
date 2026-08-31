use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
pub struct FileReadResult {
    pub text: String,
    pub path: String,
    pub hash: String,
    pub mtime: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileWriteResult {
    pub path: String,
    pub hash: String,
    pub mtime: u64,
}

fn compute_sha256(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<FileReadResult, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let mut file = File::open(p).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;

    let text = String::from_utf8_lossy(&bytes).to_string();
    let hash = compute_sha256(&bytes);

    let mtime = p
        .metadata()
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(FileReadResult {
        text,
        path,
        hash,
        mtime,
    })
}

#[tauri::command]
pub fn write_file_atomic(
    path: String,
    contents: String,
    expected_hash: Option<String>,
) -> Result<FileWriteResult, String> {
    let target = Path::new(&path);

    // If expected_hash is provided and target exists, check hash first
    if let Some(expected) = expected_hash {
        if target.exists() {
            let mut file = File::open(target).map_err(|e| e.to_string())?;
            let mut bytes = Vec::new();
            file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
            let current_hash = compute_sha256(&bytes);
            if current_hash != expected {
                return Err("Conflict: File on disk has been modified externally".to_string());
            }
        }
    }

    // Write to a temporary file in the same directory for atomic rename
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let temp_path = parent.join(format!(".tmp_{}", target.file_name().unwrap().to_string_lossy()));

    {
        let mut temp_file = File::create(&temp_path).map_err(|e| e.to_string())?;
        temp_file.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
        temp_file.sync_all().map_err(|e| e.to_string())?;
    }

    // Atomic rename
    fs::rename(&temp_path, target).map_err(|e| e.to_string())?;

    let hash = compute_sha256(contents.as_bytes());
    let mtime = target
        .metadata()
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(FileWriteResult {
        path,
        hash,
        mtime,
    })
}
