{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 1,
      "revision": 5,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      0.0,
      0.0,
      1020.0,
      850.0
    ],
    "openinpresentation": 0,
    "boxes": [
      {
        "box": {
          "id": "obj-1",
          "maxclass": "comment",
          "patching_rect": [
            20.0,
            10.0,
            880.0,
            40.0
          ],
          "text": "Button bang conversion, toggle state, and message cold storage versus hot substitution"
        }
      },
      {
        "box": {
          "id": "obj-2",
          "maxclass": "button",
          "patching_rect": [
            210.0,
            70.0,
            175.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-3",
          "maxclass": "toggle",
          "patching_rect": [
            400.0,
            70.0,
            175.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-4",
          "maxclass": "message",
          "patching_rect": [
            590.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "saved $1"
        }
      },
      {
        "box": {
          "id": "obj-5",
          "maxclass": "message",
          "patching_rect": [
            780.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "9",
          "varname": "event_0"
        }
      },
      {
        "box": {
          "id": "obj-6",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "symbol pear",
          "varname": "event_1"
        }
      },
      {
        "box": {
          "id": "obj-7",
          "maxclass": "message",
          "patching_rect": [
            210.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "bang",
          "varname": "event_2"
        }
      },
      {
        "box": {
          "id": "obj-8",
          "maxclass": "message",
          "patching_rect": [
            400.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "bang",
          "varname": "event_3"
        }
      },
      {
        "box": {
          "id": "obj-9",
          "maxclass": "message",
          "patching_rect": [
            590.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "7",
          "varname": "event_4"
        }
      },
      {
        "box": {
          "id": "obj-10",
          "maxclass": "message",
          "patching_rect": [
            780.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "set 1",
          "varname": "event_5"
        }
      },
      {
        "box": {
          "id": "obj-11",
          "maxclass": "message",
          "patching_rect": [
            20.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "bang",
          "varname": "event_6"
        }
      },
      {
        "box": {
          "id": "obj-12",
          "maxclass": "message",
          "patching_rect": [
            210.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "bang",
          "varname": "event_7"
        }
      },
      {
        "box": {
          "id": "obj-13",
          "maxclass": "message",
          "patching_rect": [
            400.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "4",
          "varname": "event_8"
        }
      },
      {
        "box": {
          "id": "obj-14",
          "maxclass": "message",
          "patching_rect": [
            590.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "new $1",
          "varname": "event_9"
        }
      },
      {
        "box": {
          "id": "obj-15",
          "maxclass": "message",
          "patching_rect": [
            780.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "9",
          "varname": "event_10"
        }
      },
      {
        "box": {
          "id": "logger",
          "maxclass": "newobj",
          "text": "js probe.js 12-ui-message",
          "varname": "logger",
          "numinlets": 64,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            770.0,
            500.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-17",
          "maxclass": "newobj",
          "patching_rect": [
            210.0,
            265.0,
            175.0,
            22.0
          ],
          "text": "thispatcher",
          "varname": "saver"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "obj-2",
            0
          ],
          "destination": [
            "logger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-3",
            0
          ],
          "destination": [
            "logger",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-4",
            0
          ],
          "destination": [
            "logger",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-5",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-6",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-7",
            0
          ],
          "destination": [
            "obj-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-8",
            0
          ],
          "destination": [
            "obj-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-9",
            0
          ],
          "destination": [
            "obj-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-10",
            0
          ],
          "destination": [
            "obj-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-11",
            0
          ],
          "destination": [
            "obj-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-12",
            0
          ],
          "destination": [
            "obj-4",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-13",
            0
          ],
          "destination": [
            "obj-4",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-14",
            0
          ],
          "destination": [
            "obj-4",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-15",
            0
          ],
          "destination": [
            "obj-4",
            0
          ]
        }
      }
    ]
  }
}
