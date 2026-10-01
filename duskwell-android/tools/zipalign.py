#!/usr/bin/env python3
"""Minimal zipalign: rewrites an APK so every uncompressed entry starts on a 4-byte boundary
(4096 for native libraries) and resources.arsc is stored uncompressed, as Android 11+ requires.
Padding goes in a proper alignment extra field (id 0xD935), like the official tool.
Usage: zipalign.py in.apk out.apk"""
import struct
import sys
import zipfile

ALIGN_EXTRA_ID = 0xD935


def main(src, dst):
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, 'w') as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            out = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            out.external_attr = info.external_attr
            stored = info.compress_type == zipfile.ZIP_STORED or info.filename == 'resources.arsc'
            out.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
            if stored:
                align = 4096 if info.filename.endswith('.so') else 4
                offset = zout.fp.tell()
                name_len = len(info.filename.encode('utf-8'))
                base = offset + 30 + name_len + 6           # 6 = alignment extra header + its u16 value
                pad = (-base) % align
                out.extra = struct.pack('<HHH', ALIGN_EXTRA_ID, 2 + pad, align) + b'\0' * pad
            zout.writestr(out, data)
    # check what we promised
    with zipfile.ZipFile(dst) as z:
        for info in z.infolist():
            if info.compress_type == zipfile.ZIP_STORED:
                with open(dst, 'rb') as f:
                    f.seek(info.header_offset)
                    hdr = f.read(30)
                    n, e = struct.unpack('<HH', hdr[26:30])
                    start = info.header_offset + 30 + n + e
                    need = 4096 if info.filename.endswith('.so') else 4
                    if start % need:
                        sys.exit('misaligned: ' + info.filename)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
