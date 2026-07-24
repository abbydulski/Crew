import os, re

path = os.path.expanduser("~/Desktop/asc-internal-tools-temp/apps/api/src/routes/crew.ts")
with open(path, "r") as f:
    content = f.read()

# 1. Add import at top (after existing imports)
old_import = 'import { Prisma } from "../generated/crew-client/index.js";'
new_import = old_import + '\nimport { OFFICE_ADDRESSES, OFFICE_NAMES, TEAM_ALIASES } from "../../../crew/src/lib/constants.js";'
content = content.replace(old_import, new_import)

# 2. Remove inline OFFICE_NAMES in sendHiredSlackNotification
content = content.replace(
    '  const OFFICE_NAMES: Record<string, string> = { LB: "Long Beach", Vegas: "Las Vegas", Norcal: "Northern California" };\n',
    ''
)

# 3. Remove inline OFFICE_ADDRESSES block
content = content.replace(
    'const OFFICE_ADDRESSES: Record<string, string> = {\n  LB: "2799 Temple Ave, Signal Hill, CA 90755",\n  Vegas: "1610 N Woodchips Rd, Pahrump, NV 89060",\n  Norcal: "755 Paige Mill Road, Palo Alto, CA 94304",\n};\n\n',
    ''
)

# 4. Remove inline TEAM_ALIASES block
content = content.replace(
    '/** Common short codes to canonical team labels. */\nconst TEAM_ALIASES: Record<string, string> = {\n  hw: "Hardware", hardware: "Hardware", sw: "Software", software: "Software",\n  field: "Field", ops: "BizOps", bizops: "BizOps", "biz ops": "BizOps",\n};\n',
    ''
)

with open(path, "w") as f:
    f.write(content)
print("Monorepo crew.ts updated to import from crew constants")
