/* ------------------------------------------------------------
name: "hoa2d"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang cpp -fpga-mem-th 4 -ct 1 -cn Hoa2D -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#ifndef  __Hoa2D_H__
#define  __Hoa2D_H__

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
#define FAUSTCLASS Hoa2D
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


class Hoa2D : public dsp {

 private:

	int fSampleRate;

 public:
	Hoa2D() {
	}

	Hoa2D(const Hoa2D&) = default;

	virtual ~Hoa2D() = default;

	Hoa2D& operator=(const Hoa2D&) = default;

	void metadata(Meta* m) {
		m->declare("compile_options", "-lang cpp -fpga-mem-th 4 -ct 1 -cn Hoa2D -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m->declare("filename", "hoa2d.dsp");
		m->declare("hoa.lib/author", "Pierre Guillot");
		m->declare("hoa.lib/copyright", "2012-2013 Guillot, Paris, Colafrancesco, CICM labex art H2H, U. Paris 8, 2019 Wargreen, 2022 Bonardi, Goutmann");
		m->declare("hoa.lib/name", "High Order Ambisonics library");
		m->declare("hoa.lib/version", "1.5.0");
		m->declare("name", "hoa2d");
	}

	virtual int getNumInputs() {
		return 2;
	}
	virtual int getNumOutputs() {
		return 63;
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

	virtual Hoa2D* clone() {
		return new Hoa2D(*this);
	}

	virtual int getSampleRate() {
		return fSampleRate;
	}

	virtual void buildUserInterface(UI* ui_interface) {
		ui_interface->openVerticalBox("hoa2d");
		ui_interface->closeBox();
	}

	virtual void compute(int count, FAUSTFLOAT** RESTRICT inputs, FAUSTFLOAT** RESTRICT outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* input1 = inputs[1];
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
		FAUSTFLOAT* output48 = outputs[48];
		FAUSTFLOAT* output49 = outputs[49];
		FAUSTFLOAT* output50 = outputs[50];
		FAUSTFLOAT* output51 = outputs[51];
		FAUSTFLOAT* output52 = outputs[52];
		FAUSTFLOAT* output53 = outputs[53];
		FAUSTFLOAT* output54 = outputs[54];
		FAUSTFLOAT* output55 = outputs[55];
		FAUSTFLOAT* output56 = outputs[56];
		FAUSTFLOAT* output57 = outputs[57];
		FAUSTFLOAT* output58 = outputs[58];
		FAUSTFLOAT* output59 = outputs[59];
		FAUSTFLOAT* output60 = outputs[60];
		FAUSTFLOAT* output61 = outputs[61];
		FAUSTFLOAT* output62 = outputs[62];
		for (int i0 = 0; i0 < count; i0 = faust_wrap_add(i0, 1)) {
			float fTemp0 = static_cast<float>(input0[i0]);
			output0[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			float fTemp1 = static_cast<float>(input1[i0]);
			output1[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp1));
			output2[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp1));
			float fTemp2 = 2.0f * fTemp1;
			output3[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp2));
			output4[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp2));
			float fTemp3 = 3.0f * fTemp1;
			output5[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp3));
			output6[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp3));
			float fTemp4 = 4.0f * fTemp1;
			output7[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp4));
			output8[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp4));
			float fTemp5 = 5.0f * fTemp1;
			output9[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp5));
			output10[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp5));
			float fTemp6 = 6.0f * fTemp1;
			output11[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp6));
			output12[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp6));
			float fTemp7 = 7.0f * fTemp1;
			output13[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp7));
			output14[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp7));
			float fTemp8 = 8.0f * fTemp1;
			output15[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp8));
			output16[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp8));
			float fTemp9 = 9.0f * fTemp1;
			output17[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp9));
			output18[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp9));
			float fTemp10 = 1e+01f * fTemp1;
			output19[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp10));
			output20[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp10));
			float fTemp11 = 11.0f * fTemp1;
			output21[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp11));
			output22[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp11));
			float fTemp12 = 12.0f * fTemp1;
			output23[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp12));
			output24[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp12));
			float fTemp13 = 13.0f * fTemp1;
			output25[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp13));
			output26[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp13));
			float fTemp14 = 14.0f * fTemp1;
			output27[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp14));
			output28[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp14));
			float fTemp15 = 15.0f * fTemp1;
			output29[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp15));
			output30[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp15));
			float fTemp16 = 16.0f * fTemp1;
			output31[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp16));
			output32[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp16));
			float fTemp17 = 17.0f * fTemp1;
			output33[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp17));
			output34[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp17));
			float fTemp18 = 18.0f * fTemp1;
			output35[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp18));
			output36[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp18));
			float fTemp19 = 19.0f * fTemp1;
			output37[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp19));
			output38[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp19));
			float fTemp20 = 2e+01f * fTemp1;
			output39[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp20));
			output40[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp20));
			float fTemp21 = 21.0f * fTemp1;
			output41[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp21));
			output42[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp21));
			float fTemp22 = 22.0f * fTemp1;
			output43[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp22));
			output44[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp22));
			float fTemp23 = 23.0f * fTemp1;
			output45[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp23));
			output46[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp23));
			float fTemp24 = 24.0f * fTemp1;
			output47[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp24));
			output48[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp24));
			float fTemp25 = 25.0f * fTemp1;
			output49[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp25));
			output50[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp25));
			float fTemp26 = 26.0f * fTemp1;
			output51[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp26));
			output52[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp26));
			float fTemp27 = 27.0f * fTemp1;
			output53[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp27));
			output54[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp27));
			float fTemp28 = 28.0f * fTemp1;
			output55[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp28));
			output56[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp28));
			float fTemp29 = 29.0f * fTemp1;
			output57[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp29));
			output58[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp29));
			float fTemp30 = 3e+01f * fTemp1;
			output59[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp30));
			output60[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp30));
			float fTemp31 = 31.0f * fTemp1;
			output61[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::sin(fTemp31));
			output62[i0] = static_cast<FAUSTFLOAT>(fTemp0 * std::cos(fTemp31));
		}
	}

};

#endif
