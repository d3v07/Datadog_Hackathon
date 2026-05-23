import { parseAction, type Action, type ActionDraft, type ActionId, type ChangeReportId, type OrgId } from "@redline/shared";

export interface ActionRepositoryOptions {
  now?: () => Date;
  nextId?: () => ActionId;
}

export class ActionRepository {
  private readonly now: () => Date;
  private readonly nextId: () => ActionId;
  private rows: Action[] = [];
  private sequence = 0;

  constructor(options: ActionRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.nextId =
      options.nextId ??
      (() => {
        this.sequence += 1;
        return `act_${String(this.sequence).padStart(6, "0")}` as ActionId;
      });
  }

  insert(draft: ActionDraft): Action {
    const action = parseAction({
      ...draft,
      id: draft.id ?? this.nextId(),
      firedAt: draft.firedAt ?? this.now().toISOString(),
    });

    this.rows = [...this.rows, action];
    return copyAction(action);
  }

  listByOrg(orgId: OrgId): Action[] {
    return this.rows.filter((action) => action.orgId === orgId).map(copyAction);
  }

  listByChangeReport(changeReportId: ChangeReportId): Action[] {
    return this.rows.filter((action) => action.changeReportId === changeReportId).map(copyAction);
  }

  all(): Action[] {
    return this.rows.map(copyAction);
  }
}

export function createActionRepository(options: ActionRepositoryOptions = {}): ActionRepository {
  return new ActionRepository(options);
}

function copyAction(action: Action): Action {
  return structuredClone(action);
}
