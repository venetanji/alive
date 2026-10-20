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
          "text": "Original local abstraction"
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
          "text": "inlet"
        }
      },
      {
        "box": {
          "id": "obj-3",
          "maxclass": "newobj",
          "patching_rect": [
            400.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "s #0-bus"
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
          "text": "r #0-bus"
        }
      },
      {
        "box": {
          "id": "obj-5",
          "maxclass": "newobj",
          "patching_rect": [
            780.0,
            70.0,
            175.0,
            22.0
          ],
          "text": "outlet"
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
            "obj-3",
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
            "obj-5",
            0
          ]
        }
      }
    ]
  }
}
