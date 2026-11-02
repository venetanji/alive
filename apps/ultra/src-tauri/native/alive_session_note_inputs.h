#pragma once
#include "alive_session.h"
#include "document_batch.h"
#ifdef __cplusplus
extern "C" {
#endif
enum { ALIVE_NOTE_INPUTS_V1=1, ALIVE_NOTE_INPUTS_MAX=16,
 ALIVE_NOTE_NONE=0, ALIVE_NOTE_POLY=1, ALIVE_NOTE_NATIVE=2,
 ALIVE_NOTE_POLICY_BUILT_IN=0, ALIVE_NOTE_POLICY_NATIVE=1,
 ALIVE_NOTE_FEATURE_NATIVE_ADMITTED=1 };
typedef struct AliveSessionNoteInputV1 {
 uint32_t device,document,note_node,kind,profile_version,policy;
 uint64_t revision;
 char profile[64];
 uint8_t dll_sha256[32];
} AliveSessionNoteInputV1;
typedef struct AliveSessionNoteInputsV1 {
 uint32_t version,struct_bytes,count,reserved;
 uint64_t preparation_revision;
 AliveSessionNoteInputV1 inputs[16];
} AliveSessionNoteInputsV1;
typedef struct AliveSessionNoteLimitsV1 {
 uint32_t version,struct_bytes,workspace_profile,features;
 uint32_t native_policy,max_native_roots,held_keys,midi_records_per_sample;
 uint32_t emergency_note_records,supported_native_features,reserved0,reserved1;
} AliveSessionNoteLimitsV1;
/* Serialized control calls; input pointers are borrowed only during the call.
 * These NEW exports return a V4 status: 0=OK, nonzero=refusal. Legacy boolean
 * exports and their diagnostics are unchanged. Neither validator constructs a
 * foreign device. Native metadata is checked but native admission is CLOSED:
 * limits features/max_native_roots are zero; valid native claims return
 * FEATURE_DISABLED. Numeric limits describe the proposed policy, not admission.
 * Every used row identifies its exact device/document/node/revision. Effects
 * use NONE/node0; built-ins POLY with all native fields zero. Native profile is
 * printable ASCII, NUL terminated with zero tail, and digest is registry-exact.
 * Unused rows/reserved fields must be zero. No caller bank pointer is accepted.
 * Prospective documents may be unordered but must cover the exact device roots.
 * Installed configuration requires retired device I/O, exact installed roots
 * and bank/binding ownership. All refusal paths preserve the configured score.
 * This foundation does not install native note policy or change scheduling. */
int alive_session_note_limits_v1(uint32_t workspace_profile,AliveSessionNoteLimitsV1*);
int alive_session_validate_prepared_notes_v1(const AliveSessionConfigV4*,
 const UltraPreparedDocumentV1*,uint32_t count,
 const AliveSessionAudioBufferV4*,uint32_t audio_count,const AliveSessionNoteInputsV1*);
int alive_session_configure_notes_v1(const AliveSessionConfigV4*,
 const AliveSessionAudioBufferV4*,uint32_t audio_count,const AliveSessionNoteInputsV1*);
#ifdef __cplusplus
}
#include <cstddef>
static_assert(sizeof(AliveSessionNoteInputV1)==128);
static_assert(offsetof(AliveSessionNoteInputV1,revision)==24);
static_assert(offsetof(AliveSessionNoteInputV1,profile)==32);
static_assert(offsetof(AliveSessionNoteInputV1,dll_sha256)==96);
static_assert(sizeof(AliveSessionNoteInputsV1)==2072);
static_assert(offsetof(AliveSessionNoteInputsV1,preparation_revision)==16);
static_assert(offsetof(AliveSessionNoteInputsV1,inputs)==24);
static_assert(sizeof(AliveSessionNoteLimitsV1)==48);
#endif
