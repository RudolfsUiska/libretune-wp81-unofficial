import { useState } from 'react';
import { Download, FolderOpen, Globe, Plus } from 'lucide-react';
import type { ProjectInfo } from '../../types/app';
import { AppBar, ContextMenu, ListItem, MessageBox, PageHeader } from '../controls';
import { useMetro } from '../context';
import { nav } from '../nav';

export function ProjectsPage() {
  const m = useMetro();
  const [ctx, setCtx] = useState<{ rect: DOMRect; p: ProjectInfo } | null>(null);
  const [confirm, setConfirm] = useState<ProjectInfo | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const current = m.currentProject;
  const others = m.availableProjects.filter((p) => p.path !== current?.path);

  const open = async (p: ProjectInfo) => {
    await m.actions.openProject(p.path);
    nav.home();
  };

  return (
    <div className="wp-page">
      <PageHeader title="projects" />
      <div className="wp-scroll">
        {current && (
          <>
            <div className="wp-group-header">open now</div>
            <ListItem
              title={current.name.toLowerCase()}
              subtitle={current.signature}
              accentSubtitle
              icon={<FolderOpen size={22} strokeWidth={1.4} />}
              onClick={() => nav.home()}
            />
          </>
        )}
        <div className="wp-group-header">{current ? 'other projects' : 'projects'}</div>
        {others.length === 0 && <p className="wp-empty-text">No other projects. Create one, or import a TunerStudio project.</p>}
        {others.map((p) => (
          <ListItem
            key={p.path}
            title={p.name.toLowerCase()}
            subtitle={`${p.signature} · ${new Date(p.modified).toLocaleDateString()}`}
            icon={<FolderOpen size={22} strokeWidth={1.4} />}
            onClick={() => open(p)}
            onLongPress={(rect) => setCtx({ rect, p })}
          />
        ))}
      </div>

      <ContextMenu
        anchor={ctx?.rect ?? null}
        onClose={() => setCtx(null)}
        items={
          ctx
            ? [
                { id: 'open', label: 'open', onClick: () => open(ctx.p) },
                { id: 'delete', label: 'delete', onClick: () => setConfirm(ctx.p) },
              ]
            : []
        }
      />
      <MessageBox
        open={!!confirm}
        title="delete project?"
        message={confirm ? `"${confirm.name}" and its tunes, logs and restore points will be deleted from this phone.` : null}
        onClose={() => setConfirm(null)}
        buttons={[
          { label: 'delete', onClick: () => confirm && m.actions.deleteProject(confirm.name) },
          { label: 'cancel', onClick: () => {} },
        ]}
      />
      <MessageBox
        open={confirmClose}
        title="close project?"
        message={m.tuneModified ? 'The tune has changes that are not saved.' : undefined}
        onClose={() => setConfirmClose(false)}
        buttons={[
          { label: 'close', onClick: () => { void m.actions.closeProject(); nav.home(); } },
          { label: 'cancel', onClick: () => {} },
        ]}
      />
      <AppBar
        buttons={[
          { id: 'new', icon: <Plus size={22} strokeWidth={1.5} />, label: 'new', onClick: m.actions.newProject },
          { id: 'import', icon: <Download size={20} strokeWidth={1.5} />, label: 'import', onClick: m.actions.importProject },
          { id: 'ini', icon: <Globe size={20} strokeWidth={1.5} />, label: 'ini online', onClick: m.actions.searchIniOnline },
        ]}
        menu={[
          ...(current
            ? [
                { id: 'restore', label: 'restore points', onClick: m.actions.restorePoints },
                { id: 'mkrestore', label: 'create restore point', onClick: m.actions.createRestorePoint },
                { id: 'close', label: 'close project', onClick: () => setConfirmClose(true) },
              ]
            : []),
        ]}
      />
    </div>
  );
}
