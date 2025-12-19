import { useEffect, useState } from "react";
import { createTag, listTags } from "../lib/api";

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#FFCC00");

  async function refresh() {
    setTags(await listTags());
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="container">
      <h1>Tags</h1>

      <div className="card">
        <label>Tag name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Color</label>
        <input value={color} onChange={(e) => setColor(e.target.value)} />
        <div style={{ marginTop: 12 }}>
          <button className="primary" onClick={async () => {
            if (!name.trim()) return;
            await createTag(name.trim(), color);
            setName("");
            await refresh();
          }}>Create</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {tags.map(t => (
          <div key={t.id} className="row-between" style={{ padding: "8px 0" }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: t.color || "#999" }} />
              <b>{t.name}</b>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
