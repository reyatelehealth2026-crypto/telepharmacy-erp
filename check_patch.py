import re, sys
path = "apps/api/src/modules/auth/auth.service.ts"
with open(path, "r") as f:
    code = f.read()
idx = code.find("Resolve channelId")
print(repr(code[idx:idx+500]))
