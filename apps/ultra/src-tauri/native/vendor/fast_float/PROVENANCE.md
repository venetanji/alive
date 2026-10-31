# fast_float 8.0.2

Unmodified headers from include/fast_float at upstream commit
50a80a73ab2ab256ba1c3bf86923ddd8b4202bc7. All upstream license texts retained.
Selected license: MIT.

Source: https://github.com/fastfloat/fast_float/tree/50a80a73ab2ab256ba1c3bf86923ddd8b4202bc7

Ultra validates its bounded decimal syntax before invoking this parser and
accepts finite values in its existing range, including correctly signed zero
on decimal underflow. No locale mutation, allocation or platform-specific
long-double conversion is introduced.
