//! Keep GTK trackpad pinch in the canvas camera instead of WebKit page magnification.
use gtk::{gdk, glib::Propagation, prelude::WidgetExt};
use std::cell::Cell;
use tauri::WebviewWindow;

pub fn install(window: &WebviewWindow) -> tauri::Result<()> {
    let target = window.clone();
    window.with_webview(move |webview| {
        let previous = Cell::new(1.0);
        webview.inner().connect_event(move |_, event| {
            let Some(pinch) = event.downcast_ref::<gdk::EventTouchpadPinch>() else {
                return Propagation::Proceed;
            };
            let raw: &gdk::ffi::GdkEventTouchpadPinch = pinch.as_ref();
            if i32::from(raw.phase) == gdk::ffi::GDK_TOUCHPAD_GESTURE_PHASE_UPDATE {
                let scale = pinch.scale();
                let factor = scale / previous.get();
                let (x, y) = pinch.position();
                if scale.is_finite() && scale > 0.0 && factor.is_finite() && factor > 0.0
                    && x.is_finite() && y.is_finite()
                {
                    previous.set(scale);
                    // Reuse the canvas's anchored Ctrl-wheel zoom, including its
                    // gesture guards. Pinches over chrome never reach that handler.
                    let options = serde_json::json!({
                        "bubbles": true, "cancelable": true, "ctrlKey": true,
                        "clientX": x, "clientY": y, "deltaY": -factor.ln() / 0.002
                    });
                    let _ = target.eval(format!(
                        "document.elementFromPoint({x},{y})?.dispatchEvent(new WheelEvent('wheel',{options}));"
                    ));
                }
            } else {
                previous.set(1.0);
            }
            // WebKit otherwise consumes this GTK gesture without a DOM wheel event.
            Propagation::Stop
        });
    })
}
