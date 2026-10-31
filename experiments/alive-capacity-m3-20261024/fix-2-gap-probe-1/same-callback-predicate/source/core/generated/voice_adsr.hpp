/* ------------------------------------------------------------
name: "voice_adsr"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang cpp -fpga-mem-th 4 -ct 1 -cn UltraAdsrKernel -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#ifndef  __UltraAdsrKernel_H__
#define  __UltraAdsrKernel_H__

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
#define FAUSTCLASS UltraAdsrKernel
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


class UltraAdsrKernel : public dsp {

 private:

	int fSampleRate;
	float fConst0;
	float fVec0[2];
	int iRec0[2];
	float fRec1[2];

 public:
	UltraAdsrKernel() {
	}

	UltraAdsrKernel(const UltraAdsrKernel&) = default;

	virtual ~UltraAdsrKernel() = default;

	UltraAdsrKernel& operator=(const UltraAdsrKernel&) = default;

	void metadata(Meta* m) {
		m->declare("compile_options", "-lang cpp -fpga-mem-th 4 -ct 1 -cn UltraAdsrKernel -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m->declare("envelopes.lib/adsr:author", "Yann Orlarey and Andrey Bundin");
		m->declare("envelopes.lib/author", "GRAME");
		m->declare("envelopes.lib/copyright", "GRAME");
		m->declare("envelopes.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("envelopes.lib/name", "Faust Envelope Library");
		m->declare("envelopes.lib/version", "1.3.0");
		m->declare("filename", "voice_adsr.dsp");
		m->declare("maths.lib/author", "GRAME");
		m->declare("maths.lib/copyright", "GRAME");
		m->declare("maths.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("maths.lib/name", "Faust Math Library");
		m->declare("maths.lib/version", "2.9.0");
		m->declare("name", "voice_adsr");
		m->declare("platform.lib/name", "Generic Platform Library");
		m->declare("platform.lib/version", "1.3.0");
	}

	virtual int getNumInputs() {
		return 5;
	}
	virtual int getNumOutputs() {
		return 1;
	}

	static void classInit(int sample_rate) {
	}

	virtual void instanceConstants(int sample_rate) {
		fSampleRate = sample_rate;
		fConst0 = 0.001f * std::min<float>(1.92e+05f, std::max<float>(1.0f, static_cast<float>(fSampleRate)));
	}

	virtual void instanceResetUserInterface() {
	}

	virtual void instanceClear() {
		for (int l0 = 0; l0 < 2; l0 = faust_wrap_add(l0, 1)) {
			fVec0[l0] = 0.0f;
		}
		for (int l1 = 0; l1 < 2; l1 = faust_wrap_add(l1, 1)) {
			iRec0[l1] = 0;
		}
		for (int l2 = 0; l2 < 2; l2 = faust_wrap_add(l2, 1)) {
			fRec1[l2] = 0.0f;
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

	virtual UltraAdsrKernel* clone() {
		return new UltraAdsrKernel(*this);
	}

	virtual int getSampleRate() {
		return fSampleRate;
	}

	virtual void buildUserInterface(UI* ui_interface) {
		ui_interface->openVerticalBox("voice_adsr");
		ui_interface->closeBox();
	}

	virtual void compute(int count, FAUSTFLOAT** RESTRICT inputs, FAUSTFLOAT** RESTRICT outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* input1 = inputs[1];
		FAUSTFLOAT* input2 = inputs[2];
		FAUSTFLOAT* input3 = inputs[3];
		FAUSTFLOAT* input4 = inputs[4];
		FAUSTFLOAT* output0 = outputs[0];
		for (int i0 = 0; i0 < count; i0 = faust_wrap_add(i0, 1)) {
			float fTemp0 = static_cast<float>(input0[i0]);
			fVec0[0] = fTemp0;
			iRec0[0] = (fTemp0 == 0.0f) * (faust_wrap_add(1, iRec0[1]));
			float fTemp1 = std::max<float>(1.0f, fConst0 * static_cast<float>(input1[i0]));
			fRec1[0] = fTemp0 + fRec1[1] * static_cast<float>(fVec0[1] >= fTemp0);
			float fTemp2 = static_cast<float>(input3[i0]);
			output0[i0] = static_cast<FAUSTFLOAT>(std::max<float>(0.0f, std::min<float>(fRec1[0] / fTemp1, std::max<float>(1.0f + (1.0f - fTemp2) * (fTemp1 - fRec1[0]) / std::max<float>(1.0f, fConst0 * static_cast<float>(input2[i0])), fTemp2)) * (1.0f - static_cast<float>(iRec0[0]) / std::max<float>(1.0f, fConst0 * static_cast<float>(input4[i0])))));
			fVec0[1] = fVec0[0];
			iRec0[1] = iRec0[0];
			fRec1[1] = fRec1[0];
		}
	}

};

#endif
