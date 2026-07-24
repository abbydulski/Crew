"""Update all files to import constants directly from @/lib/constants, remove re-exports."""
import os

def read(path):
    with open(path) as f: return f.read()
def write(path, content):
    with open(path, "w") as f: f.write(content)

def patch_monorepo():
    B = os.path.expanduser("~/Desktop/asc-internal-tools-temp/apps/crew/src")

    # -- tracker/CheckinForm.tsx --
    p = f"{B}/pages/team/tracker/CheckinForm.tsx"
    c = read(p)
    c = c.replace(
        "import { CHECKIN_TYPE_LABEL, type CheckinType } from './types';",
        "import { CHECKIN_TYPE_LABEL, type CheckinType } from '@/lib/constants';"
    )
    write(p, c); print(f"  CheckinForm.tsx")

    # -- tracker/EditUserForm.tsx --
    p = f"{B}/pages/team/tracker/EditUserForm.tsx"
    c = read(p)
    c = c.replace(
        "import { EMPLOYMENT_TYPE_OPTIONS, OFFICE_OPTIONS, SALARY_TYPE_OPTIONS, TEAM_OPTIONS, type TrackerUser } from './types';",
        "import { EMPLOYMENT_TYPE_OPTIONS, OFFICE_OPTIONS, SALARY_TYPE_OPTIONS, TEAM_OPTIONS } from '@/lib/constants';\nimport type { TrackerUser } from './types';"
    )
    write(p, c); print(f"  EditUserForm.tsx")

    # -- tracker/AddMemberForm.tsx --
    p = f"{B}/pages/team/tracker/AddMemberForm.tsx"
    c = read(p)
    c = c.replace(
        "import { EMPLOYMENT_TYPE_OPTIONS, OFFICE_OPTIONS, SALARY_TYPE_OPTIONS, TEAM_OPTIONS } from './types';",
        "import { EMPLOYMENT_TYPE_OPTIONS, OFFICE_OPTIONS, SALARY_TYPE_OPTIONS, TEAM_OPTIONS } from '@/lib/constants';"
    )
    write(p, c); print(f"  AddMemberForm.tsx")

    # -- tracker/TrackerRow.tsx --
    p = f"{B}/pages/team/tracker/TrackerRow.tsx"
    c = read(p)
    c = c.replace(
        "import { CHECKIN_TYPE_LABEL, type CheckinType, type TrackerCheckin, type TrackerUser, isReviewDue, isInternOverdue } from './types';",
        "import { CHECKIN_TYPE_LABEL, type CheckinType } from '@/lib/constants';\nimport { type TrackerCheckin, type TrackerUser, isReviewDue, isInternOverdue } from './types';"
    )
    write(p, c); print(f"  TrackerRow.tsx")

    # -- tracker/types.ts: remove re-exports --
    p = f"{B}/pages/team/tracker/types.ts"
    c = read(p)
    c = c.replace(
        """// Re-export shared constants so existing imports from './types' keep working
export {
  type CheckinType,
  CHECKIN_TYPE_LABEL,
  OFFICE_OPTIONS,
  TEAM_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  SALARY_TYPE_OPTIONS,
  PROBATION_REVIEW_DAYS,
} from '@/lib/constants';

import type { CheckinType } from '@/lib/constants';
import { PROBATION_REVIEW_DAYS } from '@/lib/constants';""",
        "import type { CheckinType } from '@/lib/constants';\nimport { PROBATION_REVIEW_DAYS } from '@/lib/constants';"
    )
    write(p, c); print(f"  tracker/types.ts")

    # -- recruiting/components/CandidateDetailModal.tsx --
    p = f"{B}/pages/recruiting/components/CandidateDetailModal.tsx"
    c = read(p)
    c = c.replace(
        'import { ALL_STATUSES } from "../types";',
        'import { ALL_STATUSES } from "@/lib/constants";'
    )
    write(p, c); print(f"  CandidateDetailModal.tsx")

    # -- recruiting/components/Board.tsx --
    p = f"{B}/pages/recruiting/components/Board.tsx"
    c = read(p)
    c = c.replace(
        'import { PIPELINE_STATUSES } from "../types";',
        'import { PIPELINE_STATUSES } from "@/lib/constants";'
    )
    write(p, c); print(f"  Board.tsx")

    # -- recruiting/components/CandidateModal.tsx --
    p = f"{B}/pages/recruiting/components/CandidateModal.tsx"
    c = read(p)
    c = c.replace(
        'import { ALL_STATUSES } from "../types";',
        'import { ALL_STATUSES } from "@/lib/constants";'
    )
    write(p, c); print(f"  CandidateModal.tsx")

    # -- recruiting/types.ts: remove re-exports --
    p = f"{B}/pages/recruiting/types.ts"
    c = read(p)
    c = c.replace(
        "\n// Re-export from shared constants so existing imports keep working\nexport { PIPELINE_STATUSES, ALL_STATUSES } from '@/lib/constants';",
        ""
    )
    write(p, c); print(f"  recruiting/types.ts")

print("Monorepo:")
patch_monorepo()
print("\nDone!")
