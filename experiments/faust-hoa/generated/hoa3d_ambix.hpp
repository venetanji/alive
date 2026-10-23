/* ------------------------------------------------------------
name: "hoa3d_ambix"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang cpp -fpga-mem-th 4 -ct 1 -cn Hoa3DAmbix -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#ifndef  __Hoa3DAmbix_H__
#define  __Hoa3DAmbix_H__

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
#define FAUSTCLASS Hoa3DAmbix
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

static float Hoa3DAmbix_faustpower2_f(float value) {
	return value * value;
}
static float Hoa3DAmbix_faustpower3_f(float value) {
	return value * value * value;
}
static float Hoa3DAmbix_faustpower4_f(float value) {
	return value * value * value * value;
}
static float Hoa3DAmbix_faustpower5_f(float value) {
	return value * value * value * value * value;
}
static float Hoa3DAmbix_faustpower6_f(float value) {
	return value * value * value * value * value * value;
}
static float Hoa3DAmbix_faustpower7_f(float value) {
	return value * value * value * value * value * value * value;
}

class Hoa3DAmbix : public dsp {

 private:

	int fSampleRate;

 public:
	Hoa3DAmbix() {
	}

	Hoa3DAmbix(const Hoa3DAmbix&) = default;

	virtual ~Hoa3DAmbix() = default;

	Hoa3DAmbix& operator=(const Hoa3DAmbix&) = default;

	void metadata(Meta* m) {
		m->declare("compile_options", "-lang cpp -fpga-mem-th 4 -ct 1 -cn Hoa3DAmbix -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m->declare("filename", "hoa3d_ambix.dsp");
		m->declare("hoa.lib/author", "Pierre Guillot");
		m->declare("hoa.lib/copyright", "2012-2013 Guillot, Paris, Colafrancesco, CICM labex art H2H, U. Paris 8, 2019 Wargreen, 2022 Bonardi, Goutmann");
		m->declare("hoa.lib/name", "High Order Ambisonics library");
		m->declare("hoa.lib/version", "1.5.0");
		m->declare("maths.lib/author", "GRAME");
		m->declare("maths.lib/copyright", "GRAME");
		m->declare("maths.lib/license", "LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m->declare("maths.lib/name", "Faust Math Library");
		m->declare("maths.lib/version", "2.9.0");
		m->declare("name", "hoa3d_ambix");
	}

	virtual int getNumInputs() {
		return 3;
	}
	virtual int getNumOutputs() {
		return 64;
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

	virtual Hoa3DAmbix* clone() {
		return new Hoa3DAmbix(*this);
	}

	virtual int getSampleRate() {
		return fSampleRate;
	}

	virtual void buildUserInterface(UI* ui_interface) {
		ui_interface->openVerticalBox("hoa3d_ambix");
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
		FAUSTFLOAT* output63 = outputs[63];
		for (int i0 = 0; i0 < count; i0 = faust_wrap_add(i0, 1)) {
			float fTemp0 = static_cast<float>(input0[i0]);
			output0[i0] = static_cast<FAUSTFLOAT>(fTemp0);
			float fTemp1 = static_cast<float>(input2[i0]);
			float fTemp2 = std::cos(fTemp1 + 1.5707964f);
			float fTemp3 = Hoa3DAmbix_faustpower2_f(fTemp2);
			float fTemp4 = std::sqrt(1.0f - fTemp3);
			float fTemp5 = static_cast<float>(input1[i0]) + 3.1415927f * static_cast<float>(faust_wrap_sub(1, static_cast<int>(std::fmod(std::fmod(0.31830987f * fTemp1 + -0.5f, 2.0f) + 2.0f, 2.0f))));
			float fTemp6 = std::sin(fTemp5);
			float fTemp7 = fTemp0 * fTemp6 * fTemp4;
			output1[i0] = static_cast<FAUSTFLOAT>(fTemp7);
			float fTemp8 = fTemp0 * fTemp2;
			output2[i0] = static_cast<FAUSTFLOAT>(-fTemp8);
			float fTemp9 = std::cos(fTemp5);
			float fTemp10 = fTemp0 * fTemp4 * fTemp9;
			output3[i0] = static_cast<FAUSTFLOAT>(fTemp10);
			float fTemp11 = 2.0f * fTemp5;
			float fTemp12 = std::sin(fTemp11);
			float fTemp13 = Hoa3DAmbix_faustpower2_f(fTemp4);
			float fTemp14 = fTemp0 * fTemp13;
			float fTemp15 = fTemp14 * fTemp12;
			output4[i0] = static_cast<FAUSTFLOAT>(0.8660254f * fTemp15);
			float fTemp16 = fTemp8 * fTemp6 * fTemp4;
			output5[i0] = static_cast<FAUSTFLOAT>(-(1.7320508f * fTemp16));
			float fTemp17 = 3.0f * fTemp3 + -1.0f;
			output6[i0] = static_cast<FAUSTFLOAT>(0.5f * fTemp0 * fTemp17);
			float fTemp18 = fTemp8 * fTemp4 * fTemp9;
			output7[i0] = static_cast<FAUSTFLOAT>(-(1.7320508f * fTemp18));
			float fTemp19 = std::cos(fTemp11);
			float fTemp20 = fTemp14 * fTemp19;
			output8[i0] = static_cast<FAUSTFLOAT>(0.8660254f * fTemp20);
			float fTemp21 = 3.0f * fTemp5;
			float fTemp22 = std::sin(fTemp21);
			float fTemp23 = Hoa3DAmbix_faustpower3_f(fTemp4);
			float fTemp24 = fTemp0 * fTemp23;
			float fTemp25 = fTemp24 * fTemp22;
			output9[i0] = static_cast<FAUSTFLOAT>(0.7905694f * fTemp25);
			float fTemp26 = fTemp8 * fTemp13;
			float fTemp27 = fTemp26 * fTemp12;
			output10[i0] = static_cast<FAUSTFLOAT>(-(1.9364917f * fTemp27));
			float fTemp28 = 3.0f - 15.0f * fTemp3;
			output11[i0] = static_cast<FAUSTFLOAT>(-(0.20412415f * fTemp7 * fTemp28));
			float fTemp29 = 2.5f * fTemp17 + -2.0f;
			output12[i0] = static_cast<FAUSTFLOAT>(-(0.33333334f * fTemp8 * fTemp29));
			output13[i0] = static_cast<FAUSTFLOAT>(-(0.20412415f * fTemp10 * fTemp28));
			float fTemp30 = fTemp26 * fTemp19;
			output14[i0] = static_cast<FAUSTFLOAT>(-(1.9364917f * fTemp30));
			float fTemp31 = std::cos(fTemp21);
			float fTemp32 = fTemp24 * fTemp31;
			output15[i0] = static_cast<FAUSTFLOAT>(0.7905694f * fTemp32);
			float fTemp33 = 4.0f * fTemp5;
			float fTemp34 = std::sin(fTemp33);
			float fTemp35 = Hoa3DAmbix_faustpower4_f(fTemp4);
			float fTemp36 = fTemp0 * fTemp35;
			float fTemp37 = fTemp36 * fTemp34;
			output16[i0] = static_cast<FAUSTFLOAT>(0.73951f * fTemp37);
			float fTemp38 = fTemp8 * fTemp23;
			float fTemp39 = fTemp38 * fTemp22;
			output17[i0] = static_cast<FAUSTFLOAT>(-(2.09165f * fTemp39));
			float fTemp40 = 105.0f * fTemp3 + -15.0f;
			output18[i0] = static_cast<FAUSTFLOAT>(0.0372678f * fTemp15 * fTemp40);
			float fTemp41 = 3.5f * fTemp28 + 12.0f;
			output19[i0] = static_cast<FAUSTFLOAT>(0.10540926f * fTemp16 * fTemp41);
			float fTemp42 = 2.3333333f * fTemp3 * fTemp29 - 1.5f * fTemp17;
			output20[i0] = static_cast<FAUSTFLOAT>(0.25f * fTemp0 * fTemp42);
			output21[i0] = static_cast<FAUSTFLOAT>(0.10540926f * fTemp18 * fTemp41);
			output22[i0] = static_cast<FAUSTFLOAT>(0.0372678f * fTemp20 * fTemp40);
			float fTemp43 = fTemp38 * fTemp31;
			output23[i0] = static_cast<FAUSTFLOAT>(-(2.09165f * fTemp43));
			float fTemp44 = std::cos(fTemp33);
			float fTemp45 = fTemp36 * fTemp44;
			output24[i0] = static_cast<FAUSTFLOAT>(0.73951f * fTemp45);
			float fTemp46 = 5.0f * fTemp5;
			float fTemp47 = std::sin(fTemp46);
			float fTemp48 = Hoa3DAmbix_faustpower5_f(fTemp4);
			float fTemp49 = fTemp0 * fTemp48;
			float fTemp50 = fTemp49 * fTemp47;
			output25[i0] = static_cast<FAUSTFLOAT>(0.70156074f * fTemp50);
			float fTemp51 = fTemp8 * fTemp35;
			float fTemp52 = fTemp51 * fTemp34;
			output26[i0] = static_cast<FAUSTFLOAT>(-(2.21853f * fTemp52));
			float fTemp53 = 105.0f - 945.0f * fTemp3;
			output27[i0] = static_cast<FAUSTFLOAT>(-(0.0049801194f * fTemp25 * fTemp53));
			float fTemp54 = 4.5f * fTemp40 + -9e+01f;
			output28[i0] = static_cast<FAUSTFLOAT>(-(0.016265001f * fTemp27 * fTemp54));
			float fTemp55 = 3.0f * fTemp3 * fTemp41 - 2.5f * fTemp28;
			output29[i0] = static_cast<FAUSTFLOAT>(-(0.06454972f * fTemp7 * fTemp55));
			float fTemp56 = 2.25f * fTemp42 - 1.3333334f * fTemp29;
			output30[i0] = static_cast<FAUSTFLOAT>(-(0.2f * fTemp8 * fTemp56));
			output31[i0] = static_cast<FAUSTFLOAT>(-(0.06454972f * fTemp10 * fTemp55));
			output32[i0] = static_cast<FAUSTFLOAT>(-(0.016265001f * fTemp30 * fTemp54));
			output33[i0] = static_cast<FAUSTFLOAT>(-(0.0049801194f * fTemp32 * fTemp53));
			float fTemp57 = fTemp51 * fTemp44;
			output34[i0] = static_cast<FAUSTFLOAT>(-(2.21853f * fTemp57));
			float fTemp58 = std::cos(fTemp46);
			float fTemp59 = fTemp49 * fTemp58;
			output35[i0] = static_cast<FAUSTFLOAT>(0.70156074f * fTemp59);
			float fTemp60 = 6.0f * fTemp5;
			float fTemp61 = std::sin(fTemp60);
			float fTemp62 = Hoa3DAmbix_faustpower6_f(fTemp4);
			float fTemp63 = fTemp0 * fTemp62;
			output36[i0] = static_cast<FAUSTFLOAT>(0.67169327f * fTemp63 * fTemp61);
			float fTemp64 = fTemp8 * fTemp48;
			output37[i0] = static_cast<FAUSTFLOAT>(-(2.3268137f * fTemp64 * fTemp47));
			float fTemp65 = 10395.0f * fTemp3 + -945.0f;
			output38[i0] = static_cast<FAUSTFLOAT>(0.0005249507f * fTemp37 * fTemp65);
			float fTemp66 = 5.5f * fTemp53 + 8.4e+02f;
			output39[i0] = static_cast<FAUSTFLOAT>(0.0019168488f * fTemp39 * fTemp66);
			float fTemp67 = 3.6666667f * fTemp3 * fTemp54 - 3.5f * fTemp40;
			output40[i0] = static_cast<FAUSTFLOAT>(0.008625819f * fTemp15 * fTemp67);
			float fTemp68 = 2.75f * fTemp55 - 2.0f * fTemp41;
			output41[i0] = static_cast<FAUSTFLOAT>(0.04364358f * fTemp16 * fTemp68);
			float fTemp69 = 2.2f * fTemp3 * fTemp56 - 1.25f * fTemp42;
			output42[i0] = static_cast<FAUSTFLOAT>(0.16666667f * fTemp0 * fTemp69);
			output43[i0] = static_cast<FAUSTFLOAT>(0.04364358f * fTemp18 * fTemp68);
			output44[i0] = static_cast<FAUSTFLOAT>(0.008625819f * fTemp20 * fTemp67);
			output45[i0] = static_cast<FAUSTFLOAT>(0.0019168488f * fTemp43 * fTemp66);
			output46[i0] = static_cast<FAUSTFLOAT>(0.0005249507f * fTemp45 * fTemp65);
			output47[i0] = static_cast<FAUSTFLOAT>(-(2.3268137f * fTemp64 * fTemp58));
			float fTemp70 = std::cos(fTemp60);
			output48[i0] = static_cast<FAUSTFLOAT>(0.67169327f * fTemp63 * fTemp70);
			float fTemp71 = 7.0f * fTemp5;
			float fTemp72 = fTemp0 * Hoa3DAmbix_faustpower7_f(fTemp4);
			output49[i0] = static_cast<FAUSTFLOAT>(0.64725983f * fTemp72 * std::sin(fTemp71));
			float fTemp73 = fTemp8 * fTemp62;
			output50[i0] = static_cast<FAUSTFLOAT>(-(2.4218247f * fTemp73 * fTemp61));
			float fTemp74 = 10395.0f - 135135.0f * fTemp3;
			output51[i0] = static_cast<FAUSTFLOAT>(-(4.569109e-05f * fTemp50 * fTemp74));
			float fTemp75 = 6.5f * fTemp65 + -9.45e+03f;
			output52[i0] = static_cast<FAUSTFLOAT>(-(0.00018276436f * fTemp52 * fTemp75));
			float fTemp76 = 4.3333335f * fTemp3 * fTemp66 - 4.5f * fTemp53;
			output53[i0] = static_cast<FAUSTFLOAT>(-(0.0009092412f * fTemp25 * fTemp76));
			float fTemp77 = 3.25f * fTemp67 - 2.6666667f * fTemp54;
			output54[i0] = static_cast<FAUSTFLOAT>(-(0.005143445f * fTemp27 * fTemp77));
			float fTemp78 = 2.6f * fTemp3 * fTemp68 - 1.75f * fTemp55;
			output55[i0] = static_cast<FAUSTFLOAT>(-(0.03149704f * fTemp7 * fTemp78));
			output56[i0] = static_cast<FAUSTFLOAT>(-(0.14285715f * fTemp8 * (2.1666667f * fTemp69 - 1.2f * fTemp56)));
			output57[i0] = static_cast<FAUSTFLOAT>(-(0.03149704f * fTemp10 * fTemp78));
			output58[i0] = static_cast<FAUSTFLOAT>(-(0.005143445f * fTemp30 * fTemp77));
			output59[i0] = static_cast<FAUSTFLOAT>(-(0.0009092412f * fTemp32 * fTemp76));
			output60[i0] = static_cast<FAUSTFLOAT>(-(0.00018276436f * fTemp57 * fTemp75));
			output61[i0] = static_cast<FAUSTFLOAT>(-(4.569109e-05f * fTemp59 * fTemp74));
			output62[i0] = static_cast<FAUSTFLOAT>(-(2.4218247f * fTemp73 * fTemp70));
			output63[i0] = static_cast<FAUSTFLOAT>(0.64725983f * fTemp72 * std::cos(fTemp71));
		}
	}

};

#endif
