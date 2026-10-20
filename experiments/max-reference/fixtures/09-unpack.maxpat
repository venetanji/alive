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
          "text": "Unpack outlet order, coercion, missing fields, excess fields and bang"
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
          "text": "unpack i f s"
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
          "text": "list 3 4.5 pear",
          "varname": "event_0"
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
          "text": "list 7",
          "varname": "event_1"
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
          "text": "list 8.75 2 kiwi extra",
          "varname": "event_2"
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
          "text": "bang",
          "varname": "event_3"
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
          "text": "symbol pear",
          "varname": "event_4"
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
          "text": "kiwi 2 3",
          "varname": "event_5"
        }
      },
      {
        "box": {
          "id": "logger",
          "maxclass": "newobj",
          "text": "js probe.js 09-unpack",
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
          "id": "obj-10",
          "maxclass": "newobj",
          "patching_rect": [
            780.0,
            135.0,
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
            "obj-2",
            2
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
            "obj-2",
            0
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
            "obj-2",
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
            "obj-2",
            0
          ]
        }
      }
    ]
  }
}
