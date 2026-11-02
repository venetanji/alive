//! Off-thread owners; the caller holds the same control lock through Drop.
use super::{canvas, native_result, NativeSource, Source, SourceRows};
use std::{ffi::c_char, ptr::NonNull};

#[repr(C)]
struct PreparedBatch { _private: [u8; 0] }
#[repr(C)]
struct Exchange { _private: [u8; 0] }
#[repr(C)]
struct NativeDocument {
    struct_bytes: u32,
    document: u32,
    graph: *const canvas::NativeGraph,
    sources: *const NativeSource,
    source_count: u32,
    reserved: u32,
}
extern "C" {
    fn ultra_prepare_document_batch_v1(rows: *const NativeDocument, count: u32, error: *mut c_char, capacity: usize) -> *mut PreparedBatch;
    fn ultra_exchange_document_batch_v1(batch: *mut PreparedBatch, owned_mask: u32, undo: *mut *mut Exchange, error: *mut c_char, capacity: usize) -> i32;
    fn ultra_restore_document_exchange_v1(undo: *mut Exchange, revisions: *const u64, count: u32, error: *mut c_char, capacity: usize) -> i32;
    fn ultra_release_document_batch_v1(batch: *mut PreparedBatch);
    fn ultra_release_document_exchange_v1(undo: *mut Exchange);
}

pub(crate) struct Document<'a> {
    pub slot: u32,
    pub graph: &'a canvas::NativeGraph,
    pub sources: &'a [Source],
}

pub(crate) struct DocumentBatch(NonNull<PreparedBatch>);
pub(crate) struct DocumentExchange(NonNull<Exchange>);

impl DocumentBatch {
    pub(crate) fn prepare(documents: &[Document<'_>]) -> Result<Self, String> {
        if documents.len() > 6 { return Err("A document batch requires at most six explicit rows.".into()); }
        let sources = documents.iter().map(|document| SourceRows::new(document.sources)).collect::<Result<Vec<_>, _>>()?;
        let rows = documents.iter().zip(&sources).map(|(document, source)| NativeDocument {
            struct_bytes: std::mem::size_of::<NativeDocument>() as u32,
            document: document.slot, graph: document.graph, sources: source.rows.as_ptr(),
            source_count: source.rows.len() as u32, reserved: 0,
        }).collect::<Vec<_>>();
        let mut prepared = std::ptr::null_mut();
        native_result(|error, capacity| {
            prepared = unsafe { ultra_prepare_document_batch_v1(rows.as_ptr(), rows.len() as u32, error, capacity) };
            i32::from(!prepared.is_null())
        })?;
        Ok(Self(NonNull::new(prepared).unwrap()))
    }

    /// The driver is retired, the session reset, and owned_mask names our roots.
    pub(crate) fn exchange(&mut self, owned_mask: u32) -> Result<DocumentExchange, String> {
        let mut undo = std::ptr::null_mut();
        native_result(|error, capacity| unsafe {
            ultra_exchange_document_batch_v1(self.0.as_ptr(), owned_mask, &mut undo, error, capacity)
        })?;
        Ok(DocumentExchange(NonNull::new(undo).expect("Native exchange returns an owner on success")))
    }
}

impl DocumentExchange {
    pub(crate) fn restore(&mut self, revisions: &[u64; 16]) -> Result<(), String> {
        native_result(|error, capacity| unsafe {
            ultra_restore_document_exchange_v1(self.0.as_ptr(), revisions.as_ptr(), revisions.len() as u32, error, capacity)
        })
    }
}

impl Drop for DocumentBatch {
    fn drop(&mut self) { unsafe { ultra_release_document_batch_v1(self.0.as_ptr()); } }
}
impl Drop for DocumentExchange {
    fn drop(&mut self) { unsafe { ultra_release_document_exchange_v1(self.0.as_ptr()); } }
}
