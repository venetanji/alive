/* ------------------------------------------------------------
name: "chain2d"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang cpp -fpga-mem-th 4 -ct 1 -cn Chain2D -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#ifndef  __Chain2D_H__
#define  __Chain2D_H__

#ifndef FAUSTFLOAT
#define FAUSTFLOAT float
#endif

#include <algorithm>
#include <cmath>
#include <cstdint>
#ifndef FAUST_INT_WRAP
#define FAUST_INT_WRAP
inline int faust_wrap_add(int a, int b) { return int((unsigned int)a + (unsigned int)b); }
inline int faust_wrap_sub(int a, int b) { return int((unsigned int)a - (unsigned int)b); }
inline int faust_wrap_mul(int a, int b) { return int((unsigned int)a * (unsigned int)b); }
#endif


#ifndef FAUSTCLASS
#define FAUSTCLASS Chain2D
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


class Chain2D : public dsp {

 private:

	int fSampleRate;

 public:
	Chain2D() {
	}

	Chain2D(const Chain2D&) = default;

	virtual ~Chain2D() = default;

	Chain2D& operator=(const Chain2D&) = default;

	void metadata(Meta* m) {
		m->declare("compile_options", "-lang cpp -fpga-mem-th 4 -ct 1 -cn Chain2D -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m->declare("filename", "chain2d.dsp");
		m->declare("hoa.lib/author", "Pierre Guillot");
		m->declare("hoa.lib/copyright", "2012-2013 Guillot, Paris, Colafrancesco, CICM labex art H2H, U. Paris 8, 2019 Wargreen, 2022 Bonardi, Goutmann");
		m->declare("hoa.lib/name", "High Order Ambisonics library");
		m->declare("hoa.lib/version", "1.5.0");
		m->declare("maths.lib/author", "GRAME");
		m->declare("maths.lib/copyright", "GRAME");
		m->declare("maths.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("maths.lib/name", "Faust Math Library");
		m->declare("maths.lib/version", "2.9.0");
		m->declare("name", "chain2d");
		m->declare("routes.lib/name", "Faust Signal Routing Library");
		m->declare("routes.lib/version", "1.4.0");
		m->declare("signals.lib/name", "Faust Routing Library");
		m->declare("signals.lib/version", "1.7.0");
	}

	virtual int getNumInputs() {
		return 3;
	}
	virtual int getNumOutputs() {
		return 31;
	}

	static void classInit(int sample_rate) {
	}

	virtual void instanceConstants(int sample_rate) {
		fSampleRate = sample_rate;
	}

	virtual void instanceResetUserInterface() {
	}

	virtual void instanceClear() {
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

	virtual Chain2D* clone() {
		return new Chain2D(*this);
	}

	virtual int getSampleRate() {
		return fSampleRate;
	}

	virtual void buildUserInterface(UI* ui_interface) {
		ui_interface->openVerticalBox("chain2d");
		ui_interface->closeBox();
	}

	virtual void compute(int count, FAUSTFLOAT** RESTRICT inputs, FAUSTFLOAT** RESTRICT outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* input1 = inputs[1];
		FAUSTFLOAT* input2 = inputs[2];
		FAUSTFLOAT* output0 = outputs[0];
		FAUSTFLOAT* output1 = outputs[1];
		FAUSTFLOAT* output2 = outputs[2];
		FAUSTFLOAT* output3 = outputs[3];
		FAUSTFLOAT* output4 = outputs[4];
		FAUSTFLOAT* output5 = outputs[5];
		FAUSTFLOAT* output6 = outputs[6];
		FAUSTFLOAT* output7 = outputs[7];
		FAUSTFLOAT* output8 = outputs[8];
		FAUSTFLOAT* output9 = outputs[9];
		FAUSTFLOAT* output10 = outputs[10];
		FAUSTFLOAT* output11 = outputs[11];
		FAUSTFLOAT* output12 = outputs[12];
		FAUSTFLOAT* output13 = outputs[13];
		FAUSTFLOAT* output14 = outputs[14];
		FAUSTFLOAT* output15 = outputs[15];
		FAUSTFLOAT* output16 = outputs[16];
		FAUSTFLOAT* output17 = outputs[17];
		FAUSTFLOAT* output18 = outputs[18];
		FAUSTFLOAT* output19 = outputs[19];
		FAUSTFLOAT* output20 = outputs[20];
		FAUSTFLOAT* output21 = outputs[21];
		FAUSTFLOAT* output22 = outputs[22];
		FAUSTFLOAT* output23 = outputs[23];
		FAUSTFLOAT* output24 = outputs[24];
		FAUSTFLOAT* output25 = outputs[25];
		FAUSTFLOAT* output26 = outputs[26];
		FAUSTFLOAT* output27 = outputs[27];
		FAUSTFLOAT* output28 = outputs[28];
		FAUSTFLOAT* output29 = outputs[29];
		FAUSTFLOAT* output30 = outputs[30];
		for (int i0 = 0; i0 < count; i0 = faust_wrap_add(i0, 1)) {
			float fTemp0 = static_cast<float>(input0[i0]);
			output0[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			float fTemp1 = static_cast<float>(input1[i0]);
			float fTemp2 = std::sin(fTemp1);
			float fTemp3 = fTemp0 * fTemp2;
			output1[i0] = static_cast<FAUSTFLOAT>(fTemp3);
			float fTemp4 = std::cos(fTemp1);
			float fTemp5 = fTemp0 * fTemp4;
			output2[i0] = static_cast<FAUSTFLOAT>(fTemp5);
			float fTemp6 = 2.0f * fTemp1;
			float fTemp7 = std::sin(fTemp6);
			float fTemp8 = fTemp0 * fTemp7;
			output3[i0] = static_cast<FAUSTFLOAT>(fTemp8);
			float fTemp9 = std::cos(fTemp6);
			float fTemp10 = fTemp0 * fTemp9;
			output4[i0] = static_cast<FAUSTFLOAT>(fTemp10);
			float fTemp11 = 3.0f * fTemp1;
			float fTemp12 = std::sin(fTemp11);
			float fTemp13 = fTemp0 * fTemp12;
			output5[i0] = static_cast<FAUSTFLOAT>(fTemp13);
			float fTemp14 = std::cos(fTemp11);
			float fTemp15 = fTemp0 * fTemp14;
			output6[i0] = static_cast<FAUSTFLOAT>(fTemp15);
			output7[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			float fTemp16 = static_cast<float>(input2[i0]);
			float fTemp17 = std::sin(fTemp16);
			float fTemp18 = std::cos(fTemp16);
			output8[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp2 * fTemp18 + fTemp4 * fTemp17));
			output9[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp4 * fTemp18 - fTemp2 * fTemp17));
			float fTemp19 = 2.0f * fTemp16;
			float fTemp20 = std::sin(fTemp19);
			float fTemp21 = std::cos(fTemp19);
			output10[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp7 * fTemp21 + fTemp9 * fTemp20));
			output11[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp9 * fTemp21 - fTemp7 * fTemp20));
			float fTemp22 = 3.0f * fTemp16;
			float fTemp23 = std::sin(fTemp22);
			float fTemp24 = std::cos(fTemp22);
			output12[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp12 * fTemp24 + fTemp14 * fTemp23));
			output13[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp14 * fTemp24 - fTemp12 * fTemp23));
			output14[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			output15[i0] = static_cast<FAUSTFLOAT>(0.75f * fTemp3);
			output16[i0] = static_cast<FAUSTFLOAT>(0.75f * fTemp5);
			output17[i0] = static_cast<FAUSTFLOAT>(0.3f * fTemp8);
			output18[i0] = static_cast<FAUSTFLOAT>(0.3f * fTemp10);
			output19[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp13);
			output20[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp15);
			float fTemp25 = 0.25f * fTemp14;
			float fTemp26 = 0.25f * fTemp9;
			float fTemp27 = 0.25f * fTemp4;
			output21[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp27 + 0.125f + fTemp26 + fTemp25));
			float fTemp28 = 0.25f * fTemp7;
			float fTemp29 = 0.17677669f * fTemp2;
			output22[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp29 + 0.125f + 0.17677669f * fTemp4 + fTemp28 + 0.17677669f * fTemp12 - 0.17677669f * fTemp14));
			float fTemp30 = 0.25f * fTemp12;
			float fTemp31 = 0.25f * fTemp2;
			output23[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp31 + 0.125f - fTemp26 - fTemp30));
			output24[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (0.17677669f * fTemp2 + 0.125f - 0.17677669f * fTemp4 - fTemp28 + 0.17677669f * fTemp12 + 0.17677669f * fTemp14));
			output25[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp26 + (0.125f - fTemp27) - fTemp25));
			output26[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp28 + (0.125f - fTemp29 - 0.17677669f * fTemp4) - 0.17677669f * fTemp12 + 0.17677669f * fTemp14));
			output27[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp30 + (0.125f - fTemp31 - fTemp26)));
			output28[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (0.125f - 0.17677669f * fTemp2 + 0.17677669f * fTemp4 - fTemp28 - 0.17677669f * fTemp12 - 0.17677669f * fTemp14));
			float fTemp32 = 0.075f * fTemp7;
			float fTemp33 = 0.13258252f * fTemp2;
			float fTemp34 = 0.0125f * fTemp12;
			float fTemp35 = 0.075f * fTemp9;
			float fTemp36 = 0.1875f * fTemp2;
			float fTemp37 = 0.13258252f * fTemp4;
			float fTemp38 = 0.13258252f * fTemp2;
			float fTemp39 = 0.70710677f * (0.1875f * fTemp4 + 0.125f + fTemp35 + 0.0125f * fTemp14);
			output29[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp39 + 0.98768836f * (fTemp38 + 0.125f + fTemp37 + fTemp32 + 0.008838835f * fTemp12 - 0.008838835f * fTemp14) + 0.809017f * (fTemp36 + 0.125f - fTemp35 - fTemp34) + 0.4539905f * (fTemp33 + 0.125f - 0.13258252f * fTemp4 - fTemp32 + 0.008838835f * fTemp12 + 0.008838835f * fTemp14)));
			output30[i0] = static_cast<FAUSTFLOAT>(fTemp0 * (fTemp39 + 0.4539905f * (fTemp32 + (0.125f - fTemp38 - fTemp37) - 0.008838835f * fTemp12 + 0.008838835f * fTemp14) + 0.809017f * (fTemp34 + (0.125f - fTemp36 - fTemp35)) + 0.98768836f * (0.125f - fTemp33 + 0.13258252f * fTemp4 - fTemp32 - 0.008838835f * fTemp12 - 0.008838835f * fTemp14)));
		}
	}

};

#endif
