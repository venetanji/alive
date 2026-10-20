/* ------------------------------------------------------------
name: "voice"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang cpp -fpga-mem-th 4 -ct 1 -cn ReferenceVoice -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#ifndef  __ReferenceVoice_H__
#define  __ReferenceVoice_H__

#ifndef FAUSTFLOAT
#define FAUSTFLOAT float
#endif

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <math.h>
#ifndef FAUST_INT_WRAP
#define FAUST_INT_WRAP
inline int faust_wrap_add(int a, int b) { return int((unsigned int)a + (unsigned int)b); }
inline int faust_wrap_sub(int a, int b) { return int((unsigned int)a - (unsigned int)b); }
inline int faust_wrap_mul(int a, int b) { return int((unsigned int)a * (unsigned int)b); }
#endif


#ifndef FAUSTCLASS
#define FAUSTCLASS ReferenceVoice
#endif

#ifdef __APPLE__
#define exp10f __exp10f
#define exp10 __exp10
#endif

#if defined(_WIN32)
#define RESTRICT __restrict
#else
#define RESTRICT __restrict__
#endif

class ReferenceVoiceSIG0 {

  private:

	int iVec2[2];
	int iRec2[2];
	int fSampleRate;

  public:

	int getNumInputsReferenceVoiceSIG0() {
		return 0;
	}
	int getNumOutputsReferenceVoiceSIG0() {
		return 1;
	}

	void instanceInitReferenceVoiceSIG0(int sample_rate) {
		fSampleRate = sample_rate;
		for (int l4 = 0; l4 < 2; l4 = faust_wrap_add(l4, 1)) {
			iVec2[l4] = 0;
		}
		for (int l5 = 0; l5 < 2; l5 = faust_wrap_add(l5, 1)) {
			iRec2[l5] = 0;
		}
	}

	void fillReferenceVoiceSIG0(int count, float* table) {
		for (int i1 = 0; i1 < count; i1 = faust_wrap_add(i1, 1)) {
			iVec2[0] = 1;
			iRec2[0] = (faust_wrap_add(iVec2[1], iRec2[1])) % 65536;
			table[i1] = std::cos(9.58738e-05f * static_cast<float>(iRec2[0]));
			iVec2[1] = iVec2[0];
			iRec2[1] = iRec2[0];
		}
	}

};

static ReferenceVoiceSIG0* newReferenceVoiceSIG0() { return (ReferenceVoiceSIG0*)new ReferenceVoiceSIG0(); }
static void deleteReferenceVoiceSIG0(ReferenceVoiceSIG0* dsp) { delete dsp; }

static float ftbl0ReferenceVoiceSIG0[65536];

class ReferenceVoice : public dsp {

 private:

	int iVec0[2];
	FAUSTFLOAT fButton0;
	float fVec1[2];
	int iRec0[2];
	int fSampleRate;
	float fConst0;
	float fConst1;
	float fRec1[2];
	FAUSTFLOAT fHslider0;
	float fConst2;
	float fRec3[2];
	FAUSTFLOAT fHslider1;
	FAUSTFLOAT fHslider2;

 public:
	ReferenceVoice() {
	}

	ReferenceVoice(const ReferenceVoice&) = default;

	virtual ~ReferenceVoice() = default;

	ReferenceVoice& operator=(const ReferenceVoice&) = default;

	void metadata(Meta* m) {
		m->declare("basics.lib/name", "Faust Basic Element Library");
		m->declare("basics.lib/version", "1.23.0");
		m->declare("compile_options", "-lang cpp -fpga-mem-th 4 -ct 1 -cn ReferenceVoice -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m->declare("envelopes.lib/asr:author", "Yann Orlarey, Stéphane Letz");
		m->declare("envelopes.lib/author", "GRAME");
		m->declare("envelopes.lib/copyright", "GRAME");
		m->declare("envelopes.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("envelopes.lib/name", "Faust Envelope Library");
		m->declare("envelopes.lib/version", "1.3.0");
		m->declare("filename", "voice.dsp");
		m->declare("maths.lib/author", "GRAME");
		m->declare("maths.lib/copyright", "GRAME");
		m->declare("maths.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("maths.lib/name", "Faust Math Library");
		m->declare("maths.lib/version", "2.9.0");
		m->declare("name", "voice");
		m->declare("oscillators.lib/name", "Faust Oscillator Library");
		m->declare("oscillators.lib/version", "1.8.0");
		m->declare("platform.lib/name", "Generic Platform Library");
		m->declare("platform.lib/version", "1.3.0");
	}

	virtual int getNumInputs() {
		return 0;
	}
	virtual int getNumOutputs() {
		return 1;
	}

	static void classInit(int sample_rate) {
		ReferenceVoiceSIG0* sig0 = newReferenceVoiceSIG0();
		sig0->instanceInitReferenceVoiceSIG0(sample_rate);
		sig0->fillReferenceVoiceSIG0(65536, ftbl0ReferenceVoiceSIG0);
		deleteReferenceVoiceSIG0(sig0);
	}

	virtual void instanceConstants(int sample_rate) {
		fSampleRate = sample_rate;
		fConst0 = std::min<float>(1.92e+05f, std::max<float>(1.0f, static_cast<float>(fSampleRate)));
		fConst1 = 1.0f / std::max<float>(1.0f, 0.00033333333f * fConst0);
		fConst2 = 1.0f / fConst0;
	}

	virtual void instanceResetUserInterface() {
		fButton0 = static_cast<FAUSTFLOAT>(0.0f);
		fHslider0 = static_cast<FAUSTFLOAT>(4.4e+02f);
		fHslider1 = static_cast<FAUSTFLOAT>(0.0f);
		fHslider2 = static_cast<FAUSTFLOAT>(1.0f);
	}

	virtual void instanceClear() {
		for (int l0 = 0; l0 < 2; l0 = faust_wrap_add(l0, 1)) {
			iVec0[l0] = 0;
		}
		for (int l1 = 0; l1 < 2; l1 = faust_wrap_add(l1, 1)) {
			fVec1[l1] = 0.0f;
		}
		for (int l2 = 0; l2 < 2; l2 = faust_wrap_add(l2, 1)) {
			iRec0[l2] = 0;
		}
		for (int l3 = 0; l3 < 2; l3 = faust_wrap_add(l3, 1)) {
			fRec1[l3] = 0.0f;
		}
		for (int l6 = 0; l6 < 2; l6 = faust_wrap_add(l6, 1)) {
			fRec3[l6] = 0.0f;
		}
	}

	virtual void init(int sample_rate) {
		classInit(sample_rate);
		instanceInit(sample_rate);
	}

	virtual void instanceInit(int sample_rate) {
		instanceConstants(sample_rate);
		instanceResetUserInterface();
		instanceClear();
	}

	virtual ReferenceVoice* clone() {
		return new ReferenceVoice(*this);
	}

	virtual int getSampleRate() {
		return fSampleRate;
	}

	virtual void buildUserInterface(UI* ui_interface) {
		ui_interface->openVerticalBox("voice");
		ui_interface->addHorizontalSlider("freq", &fHslider0, FAUSTFLOAT(4.4e+02f), FAUSTFLOAT(2e+01f), FAUSTFLOAT(2e+04f), FAUSTFLOAT(0.01f));
		ui_interface->addHorizontalSlider("gain", &fHslider1, FAUSTFLOAT(0.0f), FAUSTFLOAT(0.0f), FAUSTFLOAT(1.0f), FAUSTFLOAT(0.001f));
		ui_interface->addButton("gate", &fButton0);
		ui_interface->addHorizontalSlider("level", &fHslider2, FAUSTFLOAT(1.0f), FAUSTFLOAT(0.0f), FAUSTFLOAT(1.0f), FAUSTFLOAT(0.001f));
		ui_interface->closeBox();
	}

	virtual void compute(int count, FAUSTFLOAT** RESTRICT inputs, FAUSTFLOAT** RESTRICT outputs) {
		FAUSTFLOAT* output0 = outputs[0];
		float fSlow0 = static_cast<float>(fButton0);
		int iSlow1 = fSlow0 == 0.0f;
		float fSlow2 = fConst2 * static_cast<float>(fHslider0);
		float fSlow3 = 0.25f * static_cast<float>(fHslider2) * static_cast<float>(fHslider1);
		for (int i0 = 0; i0 < count; i0 = faust_wrap_add(i0, 1)) {
			iVec0[0] = 1;
			fVec1[0] = fSlow0;
			iRec0[0] = faust_wrap_mul(iSlow1, faust_wrap_add(1, iRec0[1]));
			fRec1[0] = fSlow0 + fRec1[1] * static_cast<float>(fVec1[1] >= fSlow0);
			float fTemp0 = ((faust_wrap_sub(1, iVec0[1])) ? 0.0f : fSlow2 + fRec3[1]);
			fRec3[0] = fTemp0 - std::floor(fTemp0);
			output0[i0] = static_cast<FAUSTFLOAT>(fSlow3 * ftbl0ReferenceVoiceSIG0[std::max<int>(0, std::min<int>(static_cast<int>(65536.0f * fRec3[0]), 65535))] * std::max<float>(0.0f, std::min<float>(fConst1 * fRec1[0], 1.0f) - fConst1 * static_cast<float>(iRec0[0])));
			iVec0[1] = iVec0[0];
			fVec1[1] = fVec1[0];
			iRec0[1] = iRec0[0];
			fRec1[1] = fRec1[0];
			fRec3[1] = fRec3[0];
		}
	}

};

#endif
