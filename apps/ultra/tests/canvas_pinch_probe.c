#include <gtk/gtk.h>
#include <stdio.h>

/* Inject only into this process's WebKit widget on its private test display. */
static GtkWidget *find_webview(GtkWidget *widget);

static void visit_child(GtkWidget *widget, gpointer result) {
    if (!*(GtkWidget **)result)
        *(GtkWidget **)result = find_webview(widget);
}

static GtkWidget *find_webview(GtkWidget *widget) {
    GType type = g_type_from_name("WebKitWebView");
    if (type && g_type_is_a(G_OBJECT_TYPE(widget), type))
        return widget;
    GtkWidget *result = NULL;
    if (GTK_IS_CONTAINER(widget))
        gtk_container_foreach(GTK_CONTAINER(widget), visit_child, &result);
    return result;
}

static gboolean tick(gpointer unused) {
    (void)unused;
    static FILE *steps;
    const char *path = g_getenv("ULTRA_TEST_PINCH_STEPS");
    if (!path)
        return G_SOURCE_REMOVE;
    if (!steps && !(steps = fopen(path, "r")))
        return G_SOURCE_CONTINUE;

    unsigned phase;
    double x, y, scale;
    if (fscanf(steps, "%u %lf %lf %lf", &phase, &x, &y, &scale) != 4) {
        fclose(steps);
        steps = NULL;
        remove(path);
        return G_SOURCE_CONTINUE;
    }

    GtkWidget *view = NULL;
    GList *windows = gtk_window_list_toplevels();
    for (GList *item = windows; item && !view; item = item->next)
        view = find_webview(GTK_WIDGET(item->data));
    g_list_free(windows);
    if (!view)
        return G_SOURCE_CONTINUE;

    GdkEvent *event = gdk_event_new(GDK_TOUCHPAD_PINCH);
    event->touchpad_pinch.window = g_object_ref(gtk_widget_get_window(view));
    event->touchpad_pinch.send_event = TRUE;
    event->touchpad_pinch.phase = phase;
    event->touchpad_pinch.n_fingers = 2;
    event->touchpad_pinch.time = (guint32)(g_get_monotonic_time() / 1000);
    event->touchpad_pinch.x = x;
    event->touchpad_pinch.y = y;
    event->touchpad_pinch.scale = scale;
    GdkSeat *seat = gdk_display_get_default_seat(gtk_widget_get_display(view));
    gdk_event_set_device(event, gdk_seat_get_pointer(seat));
    gtk_main_do_event(event);
    gdk_event_free(event);
    return G_SOURCE_CONTINUE;
}

__attribute__((constructor)) static void install_probe(void) {
    if (g_getenv("ULTRA_TEST_PRIVATE_SESSION") && g_getenv("ULTRA_TEST_PINCH_STEPS"))
        g_timeout_add(50, tick, NULL);
}
