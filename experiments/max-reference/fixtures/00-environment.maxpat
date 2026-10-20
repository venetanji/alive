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
          "text": "Read current audio/scheduler settings without changing them"
        }
      },
      {
        "box": {
          "id": "obj-2",
          "maxclass": "newobj",
          "patching_rect": [
            210.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "adstatus sr"
        }
      },
      {
        "box": {
          "id": "obj-3",
          "maxclass": "message",
          "patching_rect": [
            400.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "bang",
          "varname": "event_0"
        }
      },
      {
        "box": {
          "id": "obj-4",
          "maxclass": "newobj",
          "patching_rect": [
            590.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "adstatus sigvs"
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
          "text": "bang",
          "varname": "event_1"
        }
      },
      {
        "box": {
          "id": "obj-6",
          "maxclass": "newobj",
          "patching_rect": [
            20.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "adstatus iovs"
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
          "maxclass": "newobj",
          "patching_rect": [
            400.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "adstatus overdrive"
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
          "text": "bang",
          "varname": "event_3"
        }
      },
      {
        "box": {
          "id": "obj-10",
          "maxclass": "newobj",
          "patching_rect": [
            780.0,
            135.0,
            175.0,
            22.0
          ],
          "text": "adstatus takeover"
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
          "varname": "event_4"
        }
      },
      {
        "box": {
          "id": "obj-12",
          "maxclass": "newobj",
          "patching_rect": [
            210.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "adstatus switch"
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
          "text": "bang",
          "varname": "event_5"
        }
      },
      {
        "box": {
          "id": "obj-14",
          "maxclass": "newobj",
          "patching_rect": [
            590.0,
            200.0,
            175.0,
            22.0
          ],
          "text": "adstatus driver"
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
          "text": "bang",
          "varname": "event_6"
        }
      },
      {
        "box": {
          "id": "logger",
          "maxclass": "newobj",
          "text": "js probe.js 00-environment",
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
            "obj-2",
            1
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
            "obj-3",
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
            "obj-4",
            1
          ],
          "destination": [
            "logger",
            3
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
            "obj-4",
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
            "logger",
            4
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-6",
            1
          ],
          "destination": [
            "logger",
            5
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
            "obj-6",
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
            "logger",
            6
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-8",
            1
          ],
          "destination": [
            "logger",
            7
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
            "obj-8",
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
            "logger",
            8
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-10",
            1
          ],
          "destination": [
            "logger",
            9
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
            "obj-10",
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
            "logger",
            10
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-12",
            1
          ],
          "destination": [
            "logger",
            11
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
            "obj-12",
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
            "logger",
            12
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-14",
            1
          ],
          "destination": [
            "logger",
            13
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
            "obj-14",
            0
          ]
        }
      }
    ]
  }
}
