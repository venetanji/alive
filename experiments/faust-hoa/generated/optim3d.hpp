/* ------------------------------------------------------------
name: "optim3d"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang cpp -fpga-mem-th 4 -ct 1 -cn Optim3D -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#ifndef  __Optim3D_H__
#define  __Optim3D_H__

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
#define FAUSTCLASS Optim3D
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


class Optim3D : public dsp {

 private:

	int fSampleRate;

 public:
	Optim3D() {
	}

	Optim3D(const Optim3D&) = default;

	virtual ~Optim3D() = default;

	Optim3D& operator=(const Optim3D&) = default;

	void metadata(Meta* m) {
		m->declare("compile_options", "-lang cpp -fpga-mem-th 4 -ct 1 -cn Optim3D -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m->declare("filename", "optim3d.dsp");
		m->declare("hoa.lib/author", "Pierre Guillot");
		m->declare("hoa.lib/copyright", "2012-2013 Guillot, Paris, Colafrancesco, CICM labex art H2H, U. Paris 8, 2019 Wargreen, 2022 Bonardi, Goutmann");
		m->declare("hoa.lib/name", "High Order Ambisonics library");
		m->declare("hoa.lib/version", "1.5.0");
		m->declare("maths.lib/author", "GRAME");
		m->declare("maths.lib/copyright", "GRAME");
		m->declare("maths.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("maths.lib/name", "Faust Math Library");
		m->declare("maths.lib/version", "2.9.0");
		m->declare("name", "optim3d");
		m->declare("signals.lib/name", "Faust Routing Library");
		m->declare("signals.lib/version", "1.7.0");
	}

	virtual int getNumInputs() {
		return 16;
	}
	virtual int getNumOutputs() {
		return 48;
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

	virtual Optim3D* clone() {
		return new Optim3D(*this);
	}

	virtual int getSampleRate() {
		return fSampleRate;
	}

	virtual void buildUserInterface(UI* ui_interface) {
		ui_interface->openVerticalBox("optim3d");
		ui_interface->closeBox();
	}

	virtual void compute(int count, FAUSTFLOAT** RESTRICT inputs, FAUSTFLOAT** RESTRICT outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* input1 = inputs[1];
		FAUSTFLOAT* input2 = inputs[2];
		FAUSTFLOAT* input3 = inputs[3];
		FAUSTFLOAT* input4 = inputs[4];
		FAUSTFLOAT* input5 = inputs[5];
		FAUSTFLOAT* input6 = inputs[6];
		FAUSTFLOAT* input7 = inputs[7];
		FAUSTFLOAT* input8 = inputs[8];
		FAUSTFLOAT* input9 = inputs[9];
		FAUSTFLOAT* input10 = inputs[10];
		FAUSTFLOAT* input11 = inputs[11];
		FAUSTFLOAT* input12 = inputs[12];
		FAUSTFLOAT* input13 = inputs[13];
		FAUSTFLOAT* input14 = inputs[14];
		FAUSTFLOAT* input15 = inputs[15];
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
		FAUSTFLOAT* output31 = outputs[31];
		FAUSTFLOAT* output32 = outputs[32];
		FAUSTFLOAT* output33 = outputs[33];
		FAUSTFLOAT* output34 = outputs[34];
		FAUSTFLOAT* output35 = outputs[35];
		FAUSTFLOAT* output36 = outputs[36];
		FAUSTFLOAT* output37 = outputs[37];
		FAUSTFLOAT* output38 = outputs[38];
		FAUSTFLOAT* output39 = outputs[39];
		FAUSTFLOAT* output40 = outputs[40];
		FAUSTFLOAT* output41 = outputs[41];
		FAUSTFLOAT* output42 = outputs[42];
		FAUSTFLOAT* output43 = outputs[43];
		FAUSTFLOAT* output44 = outputs[44];
		FAUSTFLOAT* output45 = outputs[45];
		FAUSTFLOAT* output46 = outputs[46];
		FAUSTFLOAT* output47 = outputs[47];
		for (int i0 = 0; i0 < count; i0 = faust_wrap_add(i0, 1)) {
			float fTemp0 = static_cast<float>(input0[i0]);
			output0[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			float fTemp1 = static_cast<float>(input1[i0]);
			output1[i0] = static_cast<FAUSTFLOAT>(fTemp1);
			float fTemp2 = static_cast<float>(input2[i0]);
			output2[i0] = static_cast<FAUSTFLOAT>(fTemp2);
			float fTemp3 = static_cast<float>(input3[i0]);
			output3[i0] = static_cast<FAUSTFLOAT>(fTemp3);
			float fTemp4 = static_cast<float>(input4[i0]);
			output4[i0] = static_cast<FAUSTFLOAT>(fTemp4);
			float fTemp5 = static_cast<float>(input5[i0]);
			output5[i0] = static_cast<FAUSTFLOAT>(fTemp5);
			float fTemp6 = static_cast<float>(input6[i0]);
			output6[i0] = static_cast<FAUSTFLOAT>(fTemp6);
			float fTemp7 = static_cast<float>(input7[i0]);
			output7[i0] = static_cast<FAUSTFLOAT>(fTemp7);
			float fTemp8 = static_cast<float>(input8[i0]);
			output8[i0] = static_cast<FAUSTFLOAT>(fTemp8);
			float fTemp9 = static_cast<float>(input9[i0]);
			output9[i0] = static_cast<FAUSTFLOAT>(fTemp9);
			float fTemp10 = static_cast<float>(input10[i0]);
			output10[i0] = static_cast<FAUSTFLOAT>(fTemp10);
			float fTemp11 = static_cast<float>(input11[i0]);
			output11[i0] = static_cast<FAUSTFLOAT>(fTemp11);
			float fTemp12 = static_cast<float>(input12[i0]);
			output12[i0] = static_cast<FAUSTFLOAT>(fTemp12);
			float fTemp13 = static_cast<float>(input13[i0]);
			output13[i0] = static_cast<FAUSTFLOAT>(fTemp13);
			float fTemp14 = static_cast<float>(input14[i0]);
			output14[i0] = static_cast<FAUSTFLOAT>(fTemp14);
			float fTemp15 = static_cast<float>(input15[i0]);
			output15[i0] = static_cast<FAUSTFLOAT>(fTemp15);
			output16[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			output17[i0] = static_cast<FAUSTFLOAT>(0.9238795f * fTemp1);
			output18[i0] = static_cast<FAUSTFLOAT>(0.9238795f * fTemp2);
			output19[i0] = static_cast<FAUSTFLOAT>(0.9238795f * fTemp3);
			output20[i0] = static_cast<FAUSTFLOAT>(0.70710677f * fTemp4);
			output21[i0] = static_cast<FAUSTFLOAT>(0.70710677f * fTemp5);
			output22[i0] = static_cast<FAUSTFLOAT>(0.70710677f * fTemp6);
			output23[i0] = static_cast<FAUSTFLOAT>(0.70710677f * fTemp7);
			output24[i0] = static_cast<FAUSTFLOAT>(0.70710677f * fTemp8);
			output25[i0] = static_cast<FAUSTFLOAT>(0.38268343f * fTemp9);
			output26[i0] = static_cast<FAUSTFLOAT>(0.38268343f * fTemp10);
			output27[i0] = static_cast<FAUSTFLOAT>(0.38268343f * fTemp11);
			output28[i0] = static_cast<FAUSTFLOAT>(0.38268343f * fTemp12);
			output29[i0] = static_cast<FAUSTFLOAT>(0.38268343f * fTemp13);
			output30[i0] = static_cast<FAUSTFLOAT>(0.38268343f * fTemp14);
			output31[i0] = static_cast<FAUSTFLOAT>(0.38268343f * fTemp15);
			output32[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			output33[i0] = static_cast<FAUSTFLOAT>(0.75f * fTemp1);
			output34[i0] = static_cast<FAUSTFLOAT>(0.75f * fTemp2);
			output35[i0] = static_cast<FAUSTFLOAT>(0.75f * fTemp3);
			output36[i0] = static_cast<FAUSTFLOAT>(0.3f * fTemp4);
			output37[i0] = static_cast<FAUSTFLOAT>(0.3f * fTemp5);
			output38[i0] = static_cast<FAUSTFLOAT>(0.3f * fTemp6);
			output39[i0] = static_cast<FAUSTFLOAT>(0.3f * fTemp7);
			output40[i0] = static_cast<FAUSTFLOAT>(0.3f * fTemp8);
			output41[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp9);
			output42[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp10);
			output43[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp11);
			output44[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp12);
			output45[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp13);
			output46[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp14);
			output47[i0] = static_cast<FAUSTFLOAT>(0.05f * fTemp15);
		}
	}

};

#endif
