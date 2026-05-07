import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import html2canvas from 'html2canvas'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Upload, Plus, X, Sparkles, Play, Code } from 'lucide-react'

const API = import.meta.env.PROD ? 'https://miraibi-production.up.railway.app' : ''

interface Dimension { name: string; type: string; field: string }
interface Measure { name: string; type: string; field: string; aggregation: string }
interface Model { model: string; dimensions: Dimension[]; measures: Measure[]; calculations: any[] }
interface Filter { field: string; operator: string; value: string }
interface Calculation { name: string; expression: string }
interface ChatMessage {
  role: string
  content: string
  chartData?: any[]
  chartCols?: string[]
}

const OPERATORS = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains']
const COLORS = ['#1D9E75', '#378ADD', '#BA7517', '#7F77DD', '#D85A30']

interface ExploreProps {
  sharedFile?: File | null
  sharedModelYaml?: string
  onFileChange?: (file: File, yaml: string) => void
}

export default function Explore({ sharedFile, sharedModelYaml, onFileChange }: ExploreProps) {
  const [file, setFile] = useState<File | null>(sharedFile ?? null)
  const [model, setModel] = useState<Model | null>(null)
  const [modelYaml, setModelYaml] = useState(sharedModelYaml ?? '')
  const [showYaml, setShowYaml] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<Filter[]>([])
  const [calculations, setCalculations] = useState<Calculation[]>([])
  const [results, setResults] = useState<any[]>([])
  const [resultCols, setResultCols] = useState<string[]>([])
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
  if (sharedFile && sharedFile !== file) {
    setFile(sharedFile)
    if (sharedModelYaml) {
      setModelYaml(sharedModelYaml)
      // Parse the yaml to set the model
      const parseModel = async () => {
        const form = new FormData()
        form.append('file', sharedFile)
        const res = await axios.post(`${API}/explore/model`, form)
        setModel(res.data.model)
      }
      parseModel()
    }
  }
}, [sharedFile])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
  if (!acceptedFiles.length) return
  const f = acceptedFiles[0]
  setFile(f)
  try {
    const form = new FormData()
    form.append('file', f)
    const res = await axios.post(`${API}/explore/model`, form)
    setModel(res.data.model)
    setModelYaml(res.data.yaml)
    if (onFileChange) onFileChange(f, res.data.yaml)
  } catch (e) {
    console.error('Upload error:', e)
  }
}, [onFileChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    noClick: false,
    noKeyboard: false
  })

  const toggleField = (name: string) => {
    setSelectedFields(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    )
  }

  const addFilter = () => setFilters(prev => [...prev, { field: model?.dimensions[0]?.name ?? '', operator: 'equals', value: '' }])
  const removeFilter = (i: number) => setFilters(prev => prev.filter((_, idx) => idx !== i))
  const updateFilter = (i: number, key: keyof Filter, val: string) => {
    setFilters(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f))
  }

  const addCalc = () => setCalculations(prev => [...prev, { name: '', expression: '' }])
  const removeCalc = (i: number) => setCalculations(prev => prev.filter((_, idx) => idx !== i))
  const updateCalc = (i: number, key: keyof Calculation, val: string) => {
    setCalculations(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c))
  }

  const runQuery = async (overrideFilters?: Filter[], overrideFields?: string[]) => {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('model_yaml', modelYaml)
      form.append('selected_fields', JSON.stringify(overrideFields ?? selectedFields))
      form.append('filters', JSON.stringify(overrideFilters ?? filters))
      form.append('calculations', JSON.stringify(calculations))
      const res = await axios.post(`${API}/explore/query`, form)
      setResults(res.data.data)
      setResultCols(res.data.columns)
      setInsight(res.data.insight)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const runQuerySilent = async (overrideFilters?: Filter[], overrideFields?: string[]) => {
    if (!file) return null
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('model_yaml', modelYaml)
      form.append('selected_fields', JSON.stringify(overrideFields ?? selectedFields))
      form.append('filters', JSON.stringify(overrideFilters ?? filters))
      form.append('calculations', JSON.stringify(calculations))
      const res = await axios.post(`${API}/explore/query`, form)
      return { data: res.data.data, columns: res.data.columns }
    } catch (e) {
      console.error(e)
      return null
    }
  }

  const downloadPNG = async () => {
    if (!chartRef.current) return
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#141414' })
    const link = document.createElement('a')
    link.download = 'miraibi-chart.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  const downloadCSV = () => {
    if (!results.length) return
    const headers = resultCols.join(',')
    const rows = results.map(row => resultCols.map(col => row[col]).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = 'miraibi-data.csv'
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const sendMessage = async () => {
    if (!file || !chatInput.trim()) return
    const userMsg: ChatMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('model_yaml', modelYaml)
      form.append('selected_fields', JSON.stringify(selectedFields))
      form.append('filters', JSON.stringify(filters))
      form.append('calculations', JSON.stringify(calculations))
      form.append('messages', JSON.stringify([...chatMessages, userMsg]))
      form.append('user_message', userMsg.content)
      const res = await axios.post(`${API}/explore/chat`, form)
      console.log('Chat response:', res.data)

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.reply,
      }

      if (res.data.new_fields || res.data.new_filters) {
        const updatedFields = res.data.new_fields ?? selectedFields
        const updatedFilters = res.data.new_filters ?? filters
        setSelectedFields(updatedFields)
        setFilters(updatedFilters)
        const queryResult = await runQuerySilent(updatedFilters, updatedFields)
        if (queryResult) {
          assistantMsg.chartData = queryResult.data
          assistantMsg.chartCols = queryResult.columns
        }
      }

      setChatMessages(prev => [...prev, assistantMsg])
    } catch (e) { console.error(e) }
    setChatLoading(false)
  }

  const allFields = model ? [
    ...model.dimensions.map(d => ({ ...d, kind: 'dimension' })),
    ...model.measures.map(m => ({ ...m, kind: 'measure' }))
  ] : []

  const mdComponents = {
    h2: ({children}: any) => <div style={{ color: '#f0ede8', fontWeight: 700, fontSize: 11, marginBottom: 8, marginTop: 12, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{children}</div>,
    h3: ({children}: any) => <div style={{ color: '#f0ede8', fontWeight: 600, fontSize: 12, marginBottom: 6, marginTop: 10 }}>{children}</div>,
    strong: ({children}: any) => <span style={{ color: '#f0ede8', fontWeight: 600 }}>{children}</span>,
    p: ({children}: any) => <p style={{ margin: '4px 0', color: '#aaa', fontSize: 13 }}>{children}</p>,
    ul: ({children}: any) => <ul style={{ paddingLeft: 16, margin: '6px 0', color: '#aaa' }}>{children}</ul>,
    li: ({children}: any) => <li style={{ margin: '4px 0', fontSize: 13 }}>{children}</li>,
    table: ({children}: any) => <table style={{ width: '100%', borderCollapse: 'collapse' as const, margin: '8px 0', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{children}</table>,
    th: ({children}: any) => <th style={{ textAlign: 'left' as const, padding: '6px 10px', borderBottom: '0.5px solid #2a2a2a', color: '#555', fontWeight: 400 }}>{children}</th>,
    td: ({children}: any) => <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #1a1a1a', color: '#aaa' }}>{children}</td>,
  }

  const s = {
    panel: { background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 12 },
    label: { fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10, display: 'block' },
    chip: (active: boolean, kind: string) => ({
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6,
      border: `0.5px solid ${active ? (kind === 'dimension' ? '#1D9E75' : '#378ADD') : '#2a2a2a'}`,
      background: active ? (kind === 'dimension' ? 'rgba(29,158,117,0.1)' : 'rgba(55,138,221,0.1)') : 'transparent',
      color: active ? (kind === 'dimension' ? '#1D9E75' : '#378ADD') : '#888',
      fontSize: 12, cursor: 'pointer', margin: '0 6px 6px 0', fontFamily: 'DM Mono, monospace'
    }),
    input: { background: '#0e0e0e', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', color: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' },
    select: { background: '#0e0e0e', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', color: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' },
    btn: (color: string) => ({ background: 'transparent', border: `0.5px solid ${color}`, borderRadius: 6, padding: '5px 12px', color, fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer', display: 'inline-flex' as const, alignItems: 'center', gap: 5 })
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '0.5px solid #2a2a2a' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
            mirai<span style={{ color: '#1D9E75' }}>bi</span> <span style={{ color: '#555', fontWeight: 400 }}>/ explore</span>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', marginTop: 4 }}>MiraiML visual explorer</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {model && (
            <button style={s.btn('#555')} onClick={() => setShowYaml(!showYaml)}>
              <Code size={12} />{showYaml ? 'hide yaml' : 'edit yaml'}
            </button>
          )}
          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              background: showChat ? 'rgba(55,138,221,0.15)' : 'transparent',
              border: `0.5px solid ${showChat ? '#378ADD' : '#2a2a2a'}`,
              borderRadius: 8, padding: '7px 14px',
              color: showChat ? '#378ADD' : '#888',
              fontFamily: 'DM Mono, monospace', fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Sparkles size={13} />Chat AI
          </button>
        </div>
      </div>

      {/* Upload */}
      {!model && (
        <div {...getRootProps()} style={{ border: `0.5px dashed ${isDragActive ? '#1D9E75' : '#2a2a2a'}`, borderRadius: 12, padding: '2.5rem', textAlign: 'center', background: '#141414', cursor: 'pointer', marginBottom: 20 }}>
          <input {...getInputProps()} />
          <Upload size={24} style={{ margin: '0 auto 10px', color: '#1D9E75', display: 'block' }} />
          <p style={{ color: '#f0ede8', fontWeight: 500 }}>Drop a CSV to start exploring</p>
          <p style={{ color: '#555', fontSize: 12, marginTop: 4 }}>MiraiML will auto-generate your model</p>
        </div>
      )}

      {model && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

          {/* Left panel */}
          <div>
            <div style={s.panel}>
              <span style={s.label}>dataset</span>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#1D9E75' }}>{file?.name}</div>
            </div>

            <div style={s.panel}>
              <span style={s.label}>dimensions</span>
              <div style={{ marginBottom: 16 }}>
                {model.dimensions.map(d => (
                  <span key={d.name} style={s.chip(selectedFields.includes(d.name), 'dimension') as any} onClick={() => toggleField(d.name)}>{d.name}</span>
                ))}
              </div>
              <span style={s.label}>measures</span>
              <div>
                {model.measures.map(m => (
                  <span key={m.name} style={s.chip(selectedFields.includes(m.name), 'measure') as any} onClick={() => toggleField(m.name)}>{m.name}</span>
                ))}
              </div>
            </div>

            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ ...s.label, marginBottom: 0 }}>filters</span>
                <button style={s.btn('#555')} onClick={addFilter}><Plus size={10} />add</button>
              </div>
              {filters.map((f, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10, padding: 10, background: '#0e0e0e', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <select style={s.select} value={f.field} onChange={e => updateFilter(i, 'field', e.target.value)}>
                      {allFields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                    </select>
                    <button style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }} onClick={() => removeFilter(i)}><X size={12} /></button>
                  </div>
                  <select style={s.select} value={f.operator} onChange={e => updateFilter(i, 'operator', e.target.value)}>
                    {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input style={s.input} placeholder="value" value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} />
                </div>
              ))}
            </div>

            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ ...s.label, marginBottom: 0 }}>calculations</span>
                <button style={s.btn('#555')} onClick={addCalc}><Plus size={10} />add</button>
              </div>
              {calculations.map((c, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10, padding: 10, background: '#0e0e0e', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <input style={s.input} placeholder="name (e.g. roi)" value={c.name} onChange={e => updateCalc(i, 'name', e.target.value)} />
                    <button style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }} onClick={() => removeCalc(i)}><X size={12} /></button>
                  </div>
                  <input style={{ ...s.input, width: '100%' }} placeholder="expression (e.g. revenue_attributed / ad_spend)" value={c.expression} onChange={e => updateCalc(i, 'expression', e.target.value)} />
                </div>
              ))}
            </div>

            <button
              onClick={() => runQuery()}
              disabled={loading || selectedFields.length === 0}
              style={{ width: '100%', background: selectedFields.length > 0 ? '#1D9E75' : '#1a1a1a', border: 'none', borderRadius: 8, padding: '12px', color: selectedFields.length > 0 ? '#fff' : '#555', fontFamily: 'DM Mono, monospace', fontSize: 13, cursor: selectedFields.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Play size={14} />{loading ? 'running...' : 'run explore'}
            </button>
          </div>

          {/* Right panel */}
          <div>
            {showYaml && (
              <div style={s.panel}>
                <span style={s.label}>miraiml model yaml</span>
                <textarea
                  value={modelYaml}
                  onChange={e => setModelYaml(e.target.value)}
                  style={{ width: '100%', height: 200, background: '#0e0e0e', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: 12, color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none', resize: 'vertical' }}
                />
              </div>
            )}

            {results.length > 0 && (
              <>
                {/* Chart with download buttons */}
                <div style={s.panel}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ ...s.label, marginBottom: 0 }}>results — {results.length} rows</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={downloadCSV} style={s.btn('#555')}>↓ CSV</button>
                      <button onClick={downloadPNG} style={s.btn('#1D9E75')}>↓ PNG</button>
                    </div>
                  </div>
                  <div ref={chartRef} style={{ background: '#141414', padding: 8, borderRadius: 8 }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={results.slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis
                          dataKey={resultCols.find(col => results.length > 0 && typeof results[0][col] === 'string') ?? resultCols[0]}
                          tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
                        {resultCols.slice(1).filter(col =>
                          results.length > 0 && typeof results[0][col] === 'number'
                        ).map((col, i) => (
                          <Bar key={col} dataKey={col} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Data table */}
                <div style={{ ...s.panel, overflowX: 'auto' }}>
                  <span style={s.label}>data table</span>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {resultCols.map(col => (
                          <th key={col} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '0.5px solid #2a2a2a', color: '#555', fontWeight: 400 }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 20).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                          {resultCols.map(col => (
                            <td key={col} style={{ padding: '6px 10px', color: '#aaa' }}>{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Insight */}
                <div style={{ ...s.panel, borderLeft: '2px solid #1D9E75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} color="#1D9E75" />
                      <span style={{ ...s.label, marginBottom: 0 }}>mirai ai insight</span>
                    </div>
                    <button onClick={() => setShowReport(!showReport)} style={s.btn('#1D9E75')}>
                      {showReport ? 'hide report' : 'view full report ↗'}
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.8 }}>
                    <ReactMarkdown components={mdComponents}>
                      {showReport ? insight : insight.split('\n').slice(0, 8).join('\n')}
                    </ReactMarkdown>
                  </div>
                </div>
              </>
            )}

            {results.length === 0 && !loading && (
              <div style={{ ...s.panel, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>select fields and run explore to see results</p>
              </div>
            )}

            {loading && (
              <div style={{ ...s.panel, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>running miraiml query...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat drawer */}
      <div style={{
        position: 'fixed', top: 0, right: showChat ? 0 : '-420px',
        pointerEvents: showChat ? 'all' : 'none',
        width: 400, height: '100vh', background: '#0e0e0e',
        borderLeft: '0.5px solid #2a2a2a', transition: 'right 0.3s ease',
        zIndex: 100, display: 'flex', flexDirection: 'column', padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '0.5px solid #2a2a2a' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} color="#378ADD" />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#f0ede8', fontWeight: 500 }}>Chat AI</span>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555', marginTop: 4 }}>powered by claude sonnet</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', color: '#888', fontFamily: 'DM Mono, monospace', fontSize: 11, outline: 'none' }}>
              <option value="claude">Claude Sonnet</option>
              <option value="gpt" disabled>GPT-4o (soon)</option>
              <option value="gemini" disabled>Gemini (soon)</option>
            </select>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {selectedFields.length > 0 && (
          <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', marginBottom: 12, fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555' }}>
            context: {selectedFields.join(', ')} {filters.length > 0 ? `· ${filters.length} filter(s)` : ''}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {chatMessages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <p style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 12, lineHeight: 1.7 }}>ask me anything about your data</p>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['show me only march to july', 'which platform had the best roi?', 'what are the top trends?'].map(suggestion => (
                  <button key={suggestion} onClick={() => setChatInput(suggestion)} style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? 'rgba(55,138,221,0.12)' : '#141414',
                border: `0.5px solid ${msg.role === 'user' ? '#378ADD' : '#2a2a2a'}`,
                color: msg.role === 'user' ? '#378ADD' : '#aaa',
                fontFamily: 'DM Mono, monospace', fontSize: 12, lineHeight: 1.7
              }}>
                {msg.role === 'assistant' ? (
                  <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                    <ReactMarkdown components={mdComponents}>
                      {msg.content.replace(/<query_update>[\s\S]*?<\/query_update>/g, '').trim()}
                    </ReactMarkdown>
                    {msg.chartData && msg.chartData.length > 0 && (
                      <div style={{ marginTop: 12, background: '#0e0e0e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555', marginBottom: 8, textTransform: 'uppercase' }}>chart</div>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={msg.chartData.slice(0, 15)}>
                            <XAxis dataKey={msg.chartCols?.[0]} tick={{ fontSize: 9, fill: '#555' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#555' }} />
                            <Tooltip contentStyle={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, fontFamily: 'DM Mono', fontSize: 11 }} />
                            {(msg.chartCols?.slice(1) ?? []).filter(col => msg.chartData && typeof msg.chartData[0][col] === 'number').map((col, i) => (
                              <Bar key={col} dataKey={col} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: '#141414', border: '0.5px solid #2a2a2a', color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
                thinking...
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="ask about your data..."
            style={{ flex: 1, background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={sendMessage}
            disabled={chatLoading}
            style={{ background: 'rgba(55,138,221,0.15)', border: '0.5px solid #378ADD', borderRadius: 8, padding: '10px 14px', color: '#378ADD', fontFamily: 'DM Mono, monospace', fontSize: 12, cursor: 'pointer' }}
          >
            ↗
          </button>
        </div>
      </div>
    </div>
  )
}