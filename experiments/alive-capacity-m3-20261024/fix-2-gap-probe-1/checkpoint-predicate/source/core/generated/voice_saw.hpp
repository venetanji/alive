/* ------------------------------------------------------------
name: "voice_saw"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang cpp -fpga-mem-th 4 -ct 1 -cn UltraSawKernel -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#ifndef  __UltraSawKernel_H__
#define  __UltraSawKernel_H__

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
#define FAUSTCLASS UltraSawKernel
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


class UltraSawKernel : public dsp {

 private:

	int fSampleRate;
	float fConst0;
	float fConst1;
	float fRec0[2];

 public:
	UltraSawKernel() {
	}

	UltraSawKernel(const UltraSawKernel&) = default;

	virtual ~UltraSawKernel() = default;

	UltraSawKernel& operator=(const UltraSawKernel&) = default;

	void metadata(Meta* m) {
		m->declare("compile_options", "-lang cpp -fpga-mem-th 4 -ct 1 -cn UltraSawKernel -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m->declare("filename", "voice_saw.dsp");
		m->declare("maths.lib/author", "GRAME");
		m->declare("maths.lib/copyright", "GRAME");
		m->declare("maths.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("maths.lib/name", "Faust Math Library");
		m->declare("maths.lib/version", "2.9.0");
		m->declare("name", "voice_saw");
		m->declare("oscillators.lib/name", "Faust Oscillator Library");
		m->declare("oscillators.lib/saw2ptr:author", "Julius O. Smith III");
		m->declare("oscillators.lib/saw2ptr:license", "LicenseRef-STK-4.3");
		m->declare("oscillators.lib/version", "1.8.0");
		m->declare("platform.lib/name", "Generic Platform Library");
		m->declare("platform.lib/version", "1.3.0");
	}

	virtual int getNumInputs() {
		return 1;
	}
	virtual int getNumOutputs() {
		return 1;
	}

	static void classInit(int sample_rate) {
	}

	virtual void instanceConstants(int sample_rate) {
		fSampleRate = sample_rate;
		fConst0 = std::min<float>(1.92e+05f, std::max<float>(1.0f, static_cast<float>(fSampleRate)));
		fConst1 = 1.0f / fConst0;
	}

	virtual void instanceResetUserInterface() {
	}

	virtual void instanceClear() {
		for (int l0 = 0; l0 < 2; l0 = faust_wrap_add(l0, 1)) {
			fRec0[l0] = 0.0f;
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

	virtual UltraSawKernel* clone() {
		return new UltraSawKernel(*this);
	}

	virtual int getSampleRate() {
		return fSampleRate;
	}

	virtual void buildUserInterface(UI* ui_interface) {
		ui_interface->openVerticalBox("voice_saw");
		ui_interface->closeBox();
	}

	virtual void compute(int count, FAUSTFLOAT** RESTRICT inputs, FAUSTFLOAT** RESTRICT outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* output0 = outputs[0];
		for (int i0 = 0; i0 < count; i0 = faust_wrap_add(i0, 1)) {
			float fTemp0 = std::max<float>(1.1920929e-07f, std::fabs(static_cast<float>(input0[i0])));
			float fTemp1 = fConst1 * fTemp0;
			float fTemp2 = fTemp1 + -1.0f + fRec0[1];
			int iTemp3 = fTemp2 < 0.0f;
			float fTemp4 = fTemp1 + fRec0[1];
			fRec0[0] = ((iTemp3) ? fTemp4 : fTemp2);
			output0[i0] = static_cast<FAUSTFLOAT>(-1.0f + 2.0f * ((iTemp3) ? fTemp4 : fTemp1 + fRec0[1] + (1.0f - fConst0 / fTemp0) * fTemp2));
			fRec0[1] = fRec0[0];
		}
	}

};

#endif
