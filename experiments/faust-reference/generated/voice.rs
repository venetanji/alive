/* ------------------------------------------------------------
name: "voice"
Code generated with Faust 2.88.0 (https://faust.grame.fr)
Compilation options: -lang rust -fpga-mem-th 4 -ct 1 -cn ReferenceVoice -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0
------------------------------------------------------------ */

#[repr(C)]
pub struct ReferenceVoice {
	iVec0: [i32;2],
	fButton0: FaustFloat,
	fVec1: [F32;2],
	iRec0: [i32;2],
	fSampleRate: i32,
	fConst0: F32,
	fConst1: F32,
	fRec1: [F32;2],
	fHslider0: FaustFloat,
	fConst2: F32,
	fRec3: [F32;2],
	fHslider1: FaustFloat,
	fHslider2: FaustFloat,
}



pub struct ReferenceVoiceSIG0 {
	iVec2: [i32;2],
	iRec2: [i32;2],
	fSampleRate: i32,
}

impl ReferenceVoiceSIG0 {

	fn get_num_inputsReferenceVoiceSIG0(&self) -> i32 {
		return 0;
	}
	fn get_num_outputsReferenceVoiceSIG0(&self) -> i32 {
		return 1;
	}

	pub fn instance_initReferenceVoiceSIG0(&mut self, sample_rate: i32) {
		self.fSampleRate = sample_rate;
		for l4 in 0..2 {
			self.iVec2[l4 as usize] = 0;
		}
		for l5 in 0..2 {
			self.iRec2[l5 as usize] = 0;
		}
	}

	pub fn fillReferenceVoiceSIG0(&mut self, count: i32, table: &mut[F32]) {
		for i1 in 0..count {
			self.iVec2[0] = 1;
			self.iRec2[0] = (i32::wrapping_add(self.iVec2[1], self.iRec2[1])) % 65536;
			table[i1 as usize] = F32::cos(9.58738e-05 * (self.iRec2[0]) as F32);
			self.iVec2[1] = self.iVec2[0];
			self.iRec2[1] = self.iRec2[0];
		}
	}

}


pub fn newReferenceVoiceSIG0() -> ReferenceVoiceSIG0 {
	ReferenceVoiceSIG0 {
		iVec2: [0;2],
		iRec2: [0;2],
		fSampleRate: 0,
	}
}
static ftbl0ReferenceVoiceSIG0: std::sync::RwLock<[F32;65536]>  = std::sync::RwLock::new([0.0;65536]);
pub const FAUST_INPUTS: usize = 0;
pub const FAUST_OUTPUTS: usize = 1;
pub const FAUST_ACTIVES: usize = 4;
pub const FAUST_PASSIVES: usize = 0;

impl ReferenceVoice {

	pub fn new() -> ReferenceVoice {
		ReferenceVoice {
			iVec0: [0;2],
			fButton0: 0.0,
			fVec1: [0.0;2],
			iRec0: [0;2],
			fSampleRate: 0,
			fConst0: 0.0,
			fConst1: 0.0,
			fRec1: [0.0;2],
			fHslider0: 0.0,
			fConst2: 0.0,
			fRec3: [0.0;2],
			fHslider1: 0.0,
			fHslider2: 0.0,
		}
	}
	pub fn metadata(&self, m: &mut dyn Meta) {
		m.declare("basics.lib/name", r"Faust Basic Element Library");
		m.declare("basics.lib/version", r"1.23.0");
		m.declare("compile_options", r"-lang rust -fpga-mem-th 4 -ct 1 -cn ReferenceVoice -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 0");
		m.declare("envelopes.lib/asr:author", r"Yann Orlarey, Stéphane Letz");
		m.declare("envelopes.lib/author", r"GRAME");
		m.declare("envelopes.lib/copyright", r"GRAME");
		m.declare("envelopes.lib/license", r"LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m.declare("envelopes.lib/name", r"Faust Envelope Library");
		m.declare("envelopes.lib/version", r"1.3.0");
		m.declare("filename", r"voice.dsp");
		m.declare("maths.lib/author", r"GRAME");
		m.declare("maths.lib/copyright", r"GRAME");
		m.declare("maths.lib/license", r"LicenseRef-LGPL-2.1-or-later-with-Faust-exception");
		m.declare("maths.lib/name", r"Faust Math Library");
		m.declare("maths.lib/version", r"2.9.0");
		m.declare("name", r"voice");
		m.declare("oscillators.lib/name", r"Faust Oscillator Library");
		m.declare("oscillators.lib/version", r"1.8.0");
		m.declare("platform.lib/name", r"Generic Platform Library");
		m.declare("platform.lib/version", r"1.3.0");
	}

	pub fn get_sample_rate(&self) -> i32 { self.fSampleRate as i32}

	pub fn class_init(sample_rate: i32) {
		// Obtaining locks on 1 static var(s)
		let mut ftbl0ReferenceVoiceSIG0_guard = ftbl0ReferenceVoiceSIG0.write().unwrap();
		let mut sig0: ReferenceVoiceSIG0 = newReferenceVoiceSIG0();
		sig0.instance_initReferenceVoiceSIG0(sample_rate);
		sig0.fillReferenceVoiceSIG0(65536, ftbl0ReferenceVoiceSIG0_guard.as_mut());
	}
	pub fn instance_reset_params(&mut self) {
		self.fButton0 = (0.0) as FaustFloat;
		self.fHslider0 = (4.4e+02) as FaustFloat;
		self.fHslider1 = (0.0) as FaustFloat;
		self.fHslider2 = (1.0) as FaustFloat;
	}
	pub fn instance_clear(&mut self) {
		for l0 in 0..2 {
			self.iVec0[l0 as usize] = 0;
		}
		for l1 in 0..2 {
			self.fVec1[l1 as usize] = 0.0;
		}
		for l2 in 0..2 {
			self.iRec0[l2 as usize] = 0;
		}
		for l3 in 0..2 {
			self.fRec1[l3 as usize] = 0.0;
		}
		for l6 in 0..2 {
			self.fRec3[l6 as usize] = 0.0;
		}
	}
	pub fn instance_constants(&mut self, sample_rate: i32) {
		// Obtaining locks on 1 static var(s)
		let ftbl0ReferenceVoiceSIG0_guard = ftbl0ReferenceVoiceSIG0.read().unwrap();
		self.fSampleRate = sample_rate;
		self.fConst0 = F32::min(1.92e+05, F32::max(1.0, (self.fSampleRate) as F32));
		self.fConst1 = 1.0 / F32::max(1.0, 0.00033333333 * self.fConst0);
		self.fConst2 = 1.0 / self.fConst0;
	}
	pub fn instance_init(&mut self, sample_rate: i32) {
		self.instance_constants(sample_rate);
		self.instance_reset_params();
		self.instance_clear();
	}
	pub fn init(&mut self, sample_rate: i32) {
		ReferenceVoice::class_init(sample_rate);
		self.instance_init(sample_rate);
	}

	pub fn build_user_interface(&self, ui_interface: &mut dyn UI<FaustFloat>) {
		Self::build_user_interface_static(ui_interface);
	}

	pub fn build_user_interface_static(ui_interface: &mut dyn UI<FaustFloat>) {
		ui_interface.open_vertical_box("voice");
		ui_interface.add_horizontal_slider("freq", ParamIndex(0), 4.4e+02, 2e+01, 2e+04, 0.01);
		ui_interface.add_horizontal_slider("gain", ParamIndex(1), 0.0, 0.0, 1.0, 0.001);
		ui_interface.add_button("gate", ParamIndex(2));
		ui_interface.add_horizontal_slider("level", ParamIndex(3), 1.0, 0.0, 1.0, 0.001);
		ui_interface.close_box();
	}

	pub fn get_param(&self, param: ParamIndex) -> Option<FaustFloat> {
		match param.0 {
			2 => Some(self.fButton0),
			0 => Some(self.fHslider0),
			1 => Some(self.fHslider1),
			3 => Some(self.fHslider2),
			_ => None,
		}
	}

	pub fn set_param(&mut self, param: ParamIndex, value: FaustFloat) {
		match param.0 {
			2 => { self.fButton0 = value }
			0 => { self.fHslider0 = value }
			1 => { self.fHslider1 = value }
			3 => { self.fHslider2 = value }
			_ => {}
		}
	}

	pub fn compute(
		&mut self,
		count: usize,
		inputs: &[impl AsRef<[FaustFloat]>],
		outputs: &mut[impl AsMut<[FaustFloat]>],
	) {

		// Obtaining locks on 1 static var(s)
		let ftbl0ReferenceVoiceSIG0_guard = ftbl0ReferenceVoiceSIG0.read().unwrap();
		let [outputs0, .. ] = outputs.as_mut() else { panic!("wrong number of output buffers"); };
		let outputs0 = outputs0.as_mut()[..count].iter_mut();
		let mut fSlow0: F32 = (self.fButton0) as F32;
		let mut iSlow1: i32 = (fSlow0 == 0.0) as i32;
		let mut fSlow2: F32 = self.fConst2 * (self.fHslider0) as F32;
		let mut fSlow3: F32 = 0.25 * (self.fHslider2) as F32 * (self.fHslider1) as F32;
		let zipped_iterators = outputs0;
		for output0 in zipped_iterators {
			self.iVec0[0] = 1;
			self.fVec1[0] = fSlow0;
			self.iRec0[0] = i32::wrapping_mul(iSlow1, i32::wrapping_add(1, self.iRec0[1]));
			self.fRec1[0] = fSlow0 + self.fRec1[1] * ((self.fVec1[1] >= fSlow0) as i32) as u32 as F32;
			let mut fTemp0: F32 = (if i32::wrapping_sub(1, self.iVec0[1]) != 0 {0.0} else {fSlow2 + self.fRec3[1]});
			self.fRec3[0] = fTemp0 - F32::floor(fTemp0);
			*output0 = (fSlow3 * ftbl0ReferenceVoiceSIG0_guard[(core::cmp::max(0, core::cmp::min((65536.0 * self.fRec3[0]) as i32, 65535))) as usize] * F32::max(0.0, F32::min(self.fConst1 * self.fRec1[0], 1.0) - self.fConst1 * (self.iRec0[0]) as F32)) as FaustFloat;
			self.iVec0[1] = self.iVec0[0];
			self.fVec1[1] = self.fVec1[0];
			self.iRec0[1] = self.iRec0[0];
			self.fRec1[1] = self.fRec1[0];
			self.fRec3[1] = self.fRec3[0];
		}

	}

}

#[cfg(not(target_arch = "wasm32"))] // Compile ffi bindings only on non-wasm targets
mod ffi {
	use core::ffi::c_float;
	// Conditionally compile the link attribute only on non-Windows platforms
	#[cfg_attr(not(target_os = "windows"), link(name = "m"))]
	unsafe extern "C" {
		pub fn remainderf(from: c_float, to: c_float) -> c_float;
		pub fn rintf(val: c_float) -> c_float;
	}
}
fn remainderf(from: f32, to: f32) -> f32 {
	#[cfg(not(target_arch = "wasm32"))] // non-wasm targets use ffi bindings
	unsafe { ffi::remainderf(from, to) }
	#[cfg(target_arch = "wasm32")] // wasm relies on libm
	libm::remainderf(from, to)
}
fn rintf(val: f32) -> f32 {
	#[cfg(not(target_arch = "wasm32"))] // non-wasm targets use ffi bindings
	unsafe { ffi::rintf(val) }
	#[cfg(target_arch = "wasm32")] // wasm relies on libm
	libm::rintf(val)
}

impl FaustDsp for ReferenceVoice {
	type T = FaustFloat;
	fn new() -> Self where Self: Sized {
		Self::new()
	}
	fn metadata(&self, m: &mut dyn Meta) {
		self.metadata(m)
	}
	fn get_sample_rate(&self) -> i32 {
		self.get_sample_rate()
	}
	fn get_num_inputs(&self) -> i32 {
		FAUST_INPUTS as i32
	}
	fn get_num_outputs(&self) -> i32 {
		FAUST_OUTPUTS as i32
	}
	fn class_init(sample_rate: i32) where Self: Sized {
		Self::class_init(sample_rate);
	}
	fn instance_reset_params(&mut self) {
		self.instance_reset_params()
	}
	fn instance_clear(&mut self) {
		self.instance_clear()
	}
	fn instance_constants(&mut self, sample_rate: i32) {
		self.instance_constants(sample_rate)
	}
	fn instance_init(&mut self, sample_rate: i32) {
		self.instance_init(sample_rate)
	}
	fn init(&mut self, sample_rate: i32) {
		self.init(sample_rate)
	}
	fn build_user_interface(&self, ui_interface: &mut dyn UI<Self::T>) {
		self.build_user_interface(ui_interface)
	}
	fn build_user_interface_static(ui_interface: &mut dyn UI<Self::T>) where Self: Sized {
		Self::build_user_interface_static(ui_interface);
	}
	fn get_param(&self, param: ParamIndex) -> Option<Self::T> {
		self.get_param(param)
	}
	fn set_param(&mut self, param: ParamIndex, value: Self::T) {
		self.set_param(param, value)
	}
	fn compute(&mut self, count: i32, inputs: &[&[Self::T]], outputs: &mut [&mut [Self::T]]) {
		self.compute(count as usize, inputs, outputs)
	}
}
