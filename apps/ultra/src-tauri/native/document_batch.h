#pragma once
#include "external_device/live_device.h"
#ifdef __cplusplus
extern "C" {
#endif
typedef struct UltraPreparedDocumentBatch UltraPreparedDocumentBatch;
typedef struct UltraDocumentExchange UltraDocumentExchange;
typedef struct UltraPreparedDocumentV1 {
 uint32_t struct_bytes,document;
 const UltraCanvasGraph* graph;
 const UltraLiveDeviceSource* sources;
 uint32_t source_count,reserved;
} UltraPreparedDocumentV1;
/* Serialized control thread only. Preparation constructs every candidate before
 * installed roots change. One pending batch/exchange is permitted, up to six
 * candidate roots. The driver must be retired and the session unconfigured for
 * exchange/restore. Caller memory is borrowed only during each call. The caller
 * retains the same serialized ownership/lock from preparation through release;
 * this API does not grant ownership of an arbitrary reused document slot. */
UltraPreparedDocumentBatch* ultra_prepare_document_batch_v1(const UltraPreparedDocumentV1* documents,
 uint32_t count,char* error,size_t capacity);
int ultra_exchange_document_batch_v1(UltraPreparedDocumentBatch*,uint32_t owned_document_mask,
 UltraDocumentExchange** undo,char* error,size_t capacity);
/* The exchange out-pointer must initially contain NULL.
 * Revisions has 16 entries; touched slots require fresh monotonic identities.
 * Old native owners survive until restore or release; no foreign reconstruction
 * is needed for restore. Releasing an unrestored exchange commits replacement. */
int ultra_restore_document_exchange_v1(UltraDocumentExchange*,const uint64_t* revisions,
 uint32_t count,char* error,size_t capacity);
void ultra_release_document_batch_v1(UltraPreparedDocumentBatch*);
void ultra_release_document_exchange_v1(UltraDocumentExchange*);
#ifdef __cplusplus
}
#endif
