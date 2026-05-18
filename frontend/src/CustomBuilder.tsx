import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, X, BarChart3, LineChart as LineIcon, PieChart as PieIcon, AreaChart as AreaIcon, ScatterChart as ScatterIcon, Table as TableIcon, Grid as HeatmapIcon, Hash, Gauge as GaugeIcon, Database, Layers } from 'lucide-react'

interface CustomBuilderProps {
  file: File | null
  modelYaml: string
  chartData: any[]
}

interface Widget {
  id: string
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'table' | 'heatmap' | 'kpi' | 'gauge'
  config: {
    xField?: string
    yField?: string
    title?: string
  }
}

const WIDGET_TYPES = [
  { type: 'bar', label: 'Bar chart', icon: BarChart3, color: '#1D9E75' },
  { type: 'line', label: 'Line chart', icon: LineIcon, color: '#378ADD' },
  { type: 'pie', label: 'Pie chart', icon: PieIcon, color: '#BA7517' },
  { type: 'area', label: 'Area chart', icon: AreaIcon, color: '#7F77DD' },
  { type: 'scatter', label: 'Scatter plot', icon: ScatterIcon, color: '#D85A30' },
  { type: 'table', label: 'Data table', icon: TableIcon, color: '#888' },
  { type: 'heatmap', label: 'Heatmap', icon: HeatmapIcon, color: '#1D9E75' },
  { type: 'kpi', label: 'KPI card', icon: Hash, color: '#378ADD' },
  { type: 'gauge', label: 'Gauge', icon: GaugeIcon, color: '#BA7517' },
] as const

export default function CustomBuilder({ file, modelYaml, chartData }: CustomBuilderProps) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'fields' | 'widgets'>('fields')

  // Parse model yaml to extract dimensions and measures (basic parsing)
  const dimensions = modelYaml ? modelYaml.match(/(?<=dimensions:[\s\S]*?)- name: (\w+)/g)?.map(m => m.replace('- name: ', '')) ?? [] : []
  const measures = modelYaml ? modelYaml.match(/(?<=measures:[\s\S]*?)- name: \w+/g)?.map(m => m.replace('- name: ', '')) ?? [] : []

  // Better yaml parsing
  const parseFields = () => {
    const dims: string[] = []
    const meas: string[] = []
    if (!modelYaml) return { dims, meas }
    const lines = modelYaml.split('\n')
    let section = ''
    for (const line of lines) {
      if (line.startsWith('dimensions:')) section = 'dimensions'
      else if (line.startsWith('measures:')) section = 'measures'
      else if (line.startsWith('calculations:') || line.startsWith('model:')) section = ''
      else if (line.includes('- name:') || line.includes('name:')) {
        const match = line.match(/name:\s*(\w+)/)
        if (match && match[1]) {
          if (section === 'dimensions') dims.push(match[1])
          else if (section === 'measures') meas.push(match[1])
        }
      }
    }
    return { dims, meas }
  }

  const { dims, meas } = parseFields()

  const addWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      config: {
        xField: dims[0],
        yField: meas[0],
        title: WIDGET_TYPES.find(w => w.type === type)?.label
      }
    }
    setWidgets([...widgets, newWidget])
    setShowAddModal(false)
  }

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id))
  }

  const renderWidget = (widget: Widget) => {
    if (widget.type === 'bar' && widget.config.xField && widget.config.yField) {
      // Aggregate data by xField
      const aggregated = chartData.reduce((acc: any, row) => {
        const key = row[widget.config.xField!]
        if (!acc[key]) acc[key] = 0
        acc[key] += Number(row[widget.config.yField!]) || 0
        return acc
      }, {})
      const data = Object.entries(aggregated).map(([k, v]) => ({ [widget.config.xField!]: k, [widget.config.yField!]: v }))

      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis dataKey={widget.config.xField} tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
            <YAxis tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
            <Bar dataKey={widget.config.yField} fill="#1D9E75" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    // Placeholder for other types
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
        {widget.type} widget — coming next
      </div>
    )
  }

  const s = {
    label: { fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10, display: 'block' },
    chip: (color: string) => ({
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6,
      border: `0.5px solid ${color}`,
      background: 'transparent',
      color,
      fontSize: 12, cursor: 'grab', margin: '0 6px 6px 0', fontFamily: 'DM Mono, monospace'
    })
  }

  if (!file) {
    return (
      <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 16, padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>upload a csv to start building</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, minHeight: 'calc(100vh - 200px)' }}>

      {/* Sidebar */}
      <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 20, height: 'fit-content', position: 'sticky', top: 20 }}>
        {/* Sidebar tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '0.5px solid #2a2a2a', paddingBottom: 12 }}>
          <button
            onClick={() => setSidebarTab('fields')}
            style={{
              flex: 1, background: sidebarTab === 'fields' ? 'rgba(29,158,117,0.1)' : 'transparent',
              border: `0.5px solid ${sidebarTab === 'fields' ? '#1D9E75' : '#2a2a2a'}`,
              borderRadius: 6, padding: '6px 10px',
              color: sidebarTab === 'fields' ? '#1D9E75' : '#888',
              fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
            }}
          >
            <Database size={11} /> Fields
          </button>
          <button
            onClick={() => setSidebarTab('widgets')}
            style={{
              flex: 1, background: sidebarTab === 'widgets' ? 'rgba(55,138,221,0.1)' : 'transparent',
              border: `0.5px solid ${sidebarTab === 'widgets' ? '#378ADD' : '#2a2a2a'}`,
              borderRadius: 6, padding: '6px 10px',
              color: sidebarTab === 'widgets' ? '#378ADD' : '#888',
              fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
            }}
          >
            <Layers size={11} /> Widgets
          </button>
        </div>

        {/* Fields panel */}
        {sidebarTab === 'fields' && (
          <>
            <span style={s.label}>dimensions</span>
            <div style={{ marginBottom: 16 }}>
              {dims.length === 0 ? (
                <p style={{ color: '#555', fontSize: 11, fontFamily: 'DM Mono', margin: 0 }}>none detected</p>
              ) : dims.map(d => (
                <span key={d} style={s.chip('#1D9E75')}>{d}</span>
              ))}
            </div>
            <span style={s.label}>measures</span>
            <div>
              {meas.length === 0 ? (
                <p style={{ color: '#555', fontSize: 11, fontFamily: 'DM Mono', margin: 0 }}>none detected</p>
              ) : meas.map(m => (
                <span key={m} style={s.chip('#378ADD')}>{m}</span>
              ))}
            </div>
          </>
        )}

        {/* Widgets panel */}
        {sidebarTab === 'widgets' && (
          <>
            <span style={s.label}>drag onto canvas</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {WIDGET_TYPES.map(w => {
                const Icon = w.icon
                return (
                  <button
                    key={w.type}
                    onClick={() => addWidget(w.type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'transparent', border: '0.5px solid #2a2a2a', borderRadius: 8,
                      padding: '10px 12px', cursor: 'pointer',
                      color: '#aaa', fontFamily: 'DM Mono, monospace', fontSize: 12,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = w.color
                      e.currentTarget.style.color = w.color
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a2a2a'
                      e.currentTarget.style.color = '#aaa'
                    }}
                  >
                    <Icon size={14} color={w.color} />
                    {w.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Canvas */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f0ede8' }}>Custom dashboard</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', marginTop: 4 }}>{widgets.length} widget{widgets.length === 1 ? '' : 's'}</div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'rgba(29,158,117,0.1)', border: '0.5px solid #1D9E75', borderRadius: 8,
              padding: '8px 14px', color: '#1D9E75',
              fontFamily: 'DM Mono, monospace', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Plus size={14} /> Add widget
          </button>
        </div>

        {widgets.length === 0 ? (
          <div
            onClick={() => setShowAddModal(true)}
            style={{
              border: '0.5px dashed #2a2a2a', borderRadius: 16, padding: '4rem 2rem',
              textAlign: 'center', cursor: 'pointer', background: '#0e0e0e',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1D9E75'
              e.currentTarget.style.background = 'rgba(29,158,117,0.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.background = '#0e0e0e'
            }}
          >
            <Plus size={32} style={{ margin: '0 auto 12px', color: '#555', display: 'block' }} />
            <p style={{ color: '#888', fontWeight: 500, marginBottom: 4 }}>Add your first widget</p>
            <p style={{ color: '#555', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Click + or drag from the Widgets panel</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {widgets.map(w => (
              <div key={w.id} style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={s.label as any}>{w.config.title}</span>
                  <button
                    onClick={() => removeWidget(w.id)}
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                {renderWidget(w)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add widget modal */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.7)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 16,
              padding: 28, width: 600, maxWidth: '90vw'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#f0ede8' }}>Add widget</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', marginTop: 4 }}>pick a type to add to your dashboard</div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {WIDGET_TYPES.map(w => {
                const Icon = w.icon
                return (
                  <button
                    key={w.type}
                    onClick={() => addWidget(w.type)}
                    style={{
                      background: '#0e0e0e', border: '0.5px solid #2a2a2a', borderRadius: 10,
                      padding: 16, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = w.color
                      e.currentTarget.style.background = `${w.color}10`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a2a2a'
                      e.currentTarget.style.background = '#0e0e0e'
                    }}
                  >
                    <Icon size={20} color={w.color} />
                    <span style={{ color: '#aaa', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{w.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}