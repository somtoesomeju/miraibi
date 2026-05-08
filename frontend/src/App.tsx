import ReactMarkdown from 'react-markdown'
import Explore from './Explore'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Upload, Sparkles, TrendingUp, DollarSign, Users, Award } from 'lucide-react'

const API = 'https://miraibi-production.up.railway.app'

interface Insight {
  insight: string
  rows: number
  columns: string[]
}

interface ChartRow {
  [key: string]: string | number
}

export default function App() {
const [page, setPage] = useState<'dashboard' | 'explore'>('dashboard')
const [file, setFile] = useState<File | null>(null)
const [insight, setInsight] = useState<Insight | null>(null)
const [chartData, setChartData] = useState<ChartRow[]>([])
const [loading, setLoading] = useState(false)
const [question, setQuestion] = useState('')
const [askLoading, setAskLoading] = useState(false)
const [modelYaml, setModelYaml] = useState('')
const [smartFilters, setSmartFilters] = useState<any[]>([])
const [smartFields, setSmartFields] = useState<string[]>([])
const [dashChatMessages, setDashChatMessages] = useState<{role: string, content: string}[]>([])
const [mode, setMode] = useState<'select' | 'ai' | 'custom'>('select')

  const onDrop = useCallback(async (files: File[]) => {
  const f = files[0]
  setFile(f)
  setLoading(true)
  setMode('select')
  try {
    // Just generate the explore model for both modes to use
    const modelForm = new FormData()
    modelForm.append('file', f)
    const modelRes = await axios.post(`${API}/explore/model`, modelForm)
    setModelYaml(modelRes.data.yaml)

    // Parse CSV for chart data (used by both modes)
    const text = await f.text()
    const rows = text.trim().split('\n')
    const headers = rows[0].split(',')
    const parsed = rows.slice(1).map(row => {
      const vals = row.split(',')
      const obj: ChartRow = {}
      headers.forEach((h, i) => {
        const v = vals[i]?.trim()
        obj[h.trim()] = isNaN(Number(v)) ? v : Number(v)
      })
      return obj
    })
    setChartData(parsed)
  } catch (e) {
    console.error(e)
  }
  setLoading(false)
}, [])

const runAIAnalysis = async () => {
  if (!file) return
  setMode('ai')
  setLoading(true)
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await axios.post<Insight>(
      `${API}/query?question=Give me a full analysis of this dataset with key trends and recommendations`,
      form
    )
    setInsight(res.data)
  } catch (e) {
    console.error(e)
  }
  setLoading(false)
}

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false
})


  const handleAsk = async () => {
  if (!file || !question.trim()) return
  setAskLoading(true)
  const userMsg = { role: 'user', content: question }
  setDashChatMessages(prev => [...prev, userMsg])
  setQuestion('')
  try {
    const chatForm = new FormData()
    chatForm.append('file', file)
    chatForm.append('model_yaml', modelYaml)
    chatForm.append('selected_fields', JSON.stringify(smartFields))
    chatForm.append('filters', JSON.stringify(smartFilters))
    chatForm.append('calculations', JSON.stringify([]))
    chatForm.append('messages', JSON.stringify([{role: 'user', content: question}]))
    chatForm.append('user_message', question)
    const chatRes = await axios.post(`${API}/explore/chat`, chatForm)

    let updatedFields = smartFields
    let updatedFilters = smartFilters
    if (chatRes.data.new_fields) {
      updatedFields = chatRes.data.new_fields
      setSmartFields(updatedFields)
    }
    if (chatRes.data.new_filters) {
      updatedFilters = chatRes.data.new_filters
      setSmartFilters(updatedFilters)
    }

    const cleanReply = chatRes.data.reply.replace(/<query_update>[\s\S]*?<\/query_update>/g, '').trim()
    setDashChatMessages(prev => [...prev, { role: 'assistant', content: cleanReply }])

    if (updatedFields.length > 0) {
      const queryForm = new FormData()
      queryForm.append('file', file)
      queryForm.append('model_yaml', modelYaml)
      queryForm.append('selected_fields', JSON.stringify(updatedFields))
      queryForm.append('filters', JSON.stringify(updatedFilters))
      queryForm.append('calculations', JSON.stringify([]))
      const queryRes = await axios.post(`${API}/explore/query`, queryForm)
      setInsight({
        insight: queryRes.data.insight,
        rows: queryRes.data.rows,
        columns: queryRes.data.columns,
      })
      setChartData(queryRes.data.data as ChartRow[])
    }
  } catch (e) { console.error(e) }
  setAskLoading(false)
}
  const numericCols = insight?.columns.filter(c =>
    chartData.length > 0 && typeof chartData[0][c] === 'number'
  ) ?? []

  const categoryCols = insight?.columns.filter(c =>
    chartData.length > 0 && typeof chartData[0][c] === 'string'
  ) ?? []

  const COLORS = ['#1D9E75', '#378ADD', '#BA7517', '#7F77DD', '#D85A30']

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Topbar */}
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '0.5px solid #2a2a2a' }}>
  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
    mirai<span style={{ color: '#1D9E75' }}>bi</span>
  </div>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <button onClick={() => setPage('dashboard')} style={{ background: 'none', border: 'none', fontFamily: 'DM Mono, monospace', fontSize: 12, color: page === 'dashboard' ? '#1D9E75' : '#555', cursor: 'pointer' }}>dashboard</button>
    <button onClick={() => setPage('explore')} style={{ background: 'none', border: 'none', fontFamily: 'DM Mono, monospace', fontSize: 12, color: page === 'explore' ? '#1D9E75' : '#555', cursor: 'pointer' }}>explore</button>
    {file && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 4, padding: '3px 10px', color: '#888' }}>{file.name}</span>}
    {insight && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 4, padding: '3px 10px', color: '#888' }}>{insight.rows} rows · {insight.columns.length} cols</span>}{mode !== 'select' && file && (
  <button
    onClick={() => setMode('select')}
    style={{ background: 'none', border: 'none', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', cursor: 'pointer' }}
  >
    switch mode
  </button>
)}
  </div>
</div>
      {page === 'explore' ? (
  <Explore 
    sharedFile={file} 
    sharedModelYaml={modelYaml}
    onFileChange={(f, yaml) => { setFile(f); setModelYaml(yaml) }}
  />
) : (<>
        {/* Upload */}
        <div {...getRootProps()} style={{ border: `0.5px dashed ${isDragActive ? '#1D9E75' : '#2a2a2a'}`, borderRadius: 12, padding: '2.5rem', textAlign: 'center', marginBottom: '2rem', background: isDragActive ? 'rgba(29,158,117,0.05)' : '#141414', cursor: 'pointer', transition: 'all 0.2s' }}>
          <input {...getInputProps()} />
          <Upload size={28} style={{ margin: '0 auto 12px', color: '#1D9E75', display: 'block' }} />
          <p style={{ color: '#f0ede8', fontWeight: 500, marginBottom: 4 }}>
            {isDragActive ? 'Drop it here' : 'Drop a CSV file or click to upload'}
          </p>
          <p style={{ color: '#555', fontSize: 13 }}>BigQuery · Snowflake connectors coming soon</p>
        </div>

       {loading && (
  <div style={{ textAlign: 'center', padding: '3rem', color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>
    {mode === 'ai' ? 'analyzing with mirai ai...' : 'preparing your dataset...'}
  </div>
)}

{/* Mode selection */}
{file && !loading && mode === 'select' && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
    <div
      onClick={runAIAnalysis}
      style={{
        background: '#141414',
        border: '0.5px solid #2a2a2a',
        borderRadius: 16,
        padding: 32,
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#1D9E75'
        e.currentTarget.style.background = 'rgba(29,158,117,0.04)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a2a'
        e.currentTarget.style.background = '#141414'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Sparkles size={18} color="#1D9E75" />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em' }}>recommended</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#f0ede8', marginBottom: 8, letterSpacing: '-0.5px' }}>AI insights</div>
      <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        Let Mirai AI analyze your data and generate a full dashboard with trends, key highlights, and recommendations.
      </p>
      <ul style={{ paddingLeft: 16, color: '#666', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
        <li>Auto-generated charts</li>
        <li>AI-written insights</li>
        <li>Conversational follow-ups</li>
      </ul>
      <div style={{ marginTop: 24, color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
        analyze with ai →
      </div>
    </div>

    <div
      onClick={() => setMode('custom')}
      style={{
        background: '#141414',
        border: '0.5px solid #2a2a2a',
        borderRadius: 16,
        padding: 32,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#378ADD'
        e.currentTarget.style.background = 'rgba(55,138,221,0.04)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a2a'
        e.currentTarget.style.background = '#141414'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <TrendingUp size={18} color="#378ADD" />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>power user</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#f0ede8', marginBottom: 8, letterSpacing: '-0.5px' }}>Build from scratch</div>
      <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        Drag and drop widgets to build your own custom dashboard. Choose from charts, KPIs, tables, and more.
      </p>
      <ul style={{ paddingLeft: 16, color: '#666', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
        <li>Bar, line, pie, area charts</li>
        <li>KPI cards, gauges, heatmaps</li>
        <li>Drag-and-drop layout</li>
      </ul>
      <div style={{ marginTop: 24, color: '#378ADD', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
        start building →
      </div>
    </div>
  </div>
)}

{/* Custom dashboard placeholder */}
{file && !loading && mode === 'custom' && (
  <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 16, padding: '4rem 2rem', textAlign: 'center' }}>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(55,138,221,0.1)', border: '0.5px solid #378ADD', borderRadius: 20, marginBottom: 24 }}>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>coming next</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: '#f0ede8', marginBottom: 12, letterSpacing: '-0.5px' }}>Custom dashboard builder</div>
    <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
      We're building drag-and-drop widgets right now. For now, switch to AI insights or use the Explore page to query your data.
    </p>
    <button
      onClick={() => setMode('select')}
      style={{ background: 'transparent', border: '0.5px solid #555', borderRadius: 8, padding: '10px 20px', color: '#888', fontFamily: 'DM Mono, monospace', fontSize: 12, cursor: 'pointer' }}
    >
      ← back to mode selection
    </button>
  </div>
)}

{insight && !loading && mode === 'ai' && (

          <>
            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: '1.5rem' }}>
              {[
                { label: 'Total rows', value: insight.rows.toLocaleString(), icon: <Users size={16} color="#1D9E75" /> },
                { label: 'Columns', value: insight.columns.length, icon: <TrendingUp size={16} color="#378ADD" /> },
                { label: 'Numeric fields', value: numericCols.length, icon: <DollarSign size={16} color="#BA7517" /> },
                { label: 'AI insights', value: 'Ready', icon: <Award size={16} color="#7F77DD" /> },
              ].map((m, i) => (
                <div key={i} style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>{m.icon}<span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span></div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f0ede8' }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
{categoryCols.length >= 1 && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
    <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
        {numericCols.length >= 1 ? `${numericCols[0]} by ${categoryCols[0]}` : `${categoryCols[0]} distribution`}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={(numericCols.length >= 1 ? chartData.slice(0, 20) :
  Object.entries(chartData.reduce((acc: any, row) => {
    const key = row[categoryCols[0]] as string
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})).map(([k, v]) => ({ [categoryCols[0]]: k, count: v as number }))
) as any}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis dataKey={categoryCols[0]} tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
          <YAxis tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
          <Bar dataKey={numericCols.length >= 1 ? numericCols[0] : 'count'} fill="#1D9E75" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>trends — {numericCols.slice(0, 3).join(' · ')}</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData.slice(0, 20)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis dataKey={categoryCols[0]} tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
          <YAxis tick={{ fontSize: 10, fill: '#555', fontFamily: 'DM Mono' }} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontFamily: 'DM Mono', fontSize: 11, color: '#555' }} />
          {numericCols.slice(0, 3).map((col, i) => (
            <Line key={col} type="monotone" dataKey={col} stroke={COLORS[i]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

            {/* AI Insight */}
<div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderLeft: '2px solid #1D9E75', borderRadius: 12, padding: 24, marginBottom: '1.5rem' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    <Sparkles size={14} color="#1D9E75" />
    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mirai AI insight</span>
  </div>
  <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.8 }}>
    <ReactMarkdown
      components={{
        h2: ({children}) => <div style={{ color: '#f0ede8', fontWeight: 700, fontSize: 11, marginBottom: 8, marginTop: 12, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{children}</div>,
        h3: ({children}) => <div style={{ color: '#f0ede8', fontWeight: 600, fontSize: 12, marginBottom: 6, marginTop: 10 }}>{children}</div>,
        strong: ({children}) => <span style={{ color: '#f0ede8', fontWeight: 600 }}>{children}</span>,
        p: ({children}) => <p style={{ margin: '4px 0', color: '#aaa', fontSize: 14 }}>{children}</p>,
        ul: ({children}) => <ul style={{ paddingLeft: 16, margin: '6px 0', color: '#aaa' }}>{children}</ul>,
        li: ({children}) => <li style={{ margin: '4px 0', fontSize: 14 }}>{children}</li>,
        table: ({children}) => <table style={{ width: '100%', borderCollapse: 'collapse' as const, margin: '8px 0', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{children}</table>,
        th: ({children}) => <th style={{ textAlign: 'left' as const, padding: '6px 10px', borderBottom: '0.5px solid #2a2a2a', color: '#555', fontWeight: 400 }}>{children}</th>,
        td: ({children}) => <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #1a1a1a', color: '#aaa' }}>{children}</td>,
      }}
    >
      {insight.insight}
    </ReactMarkdown>
  </div>
</div>

            {/* Ask follow-up */}
<div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 20, marginTop: '1rem' }}>
  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>ask mirai about your data</div>

  {/* Chat history */}
  {dashChatMessages.length > 0 && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 400, overflowY: 'auto' }}>
      {dashChatMessages.map((msg, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '85%', padding: '10px 14px',
            borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            background: msg.role === 'user' ? 'rgba(29,158,117,0.12)' : '#0e0e0e',
            border: `0.5px solid ${msg.role === 'user' ? '#1D9E75' : '#2a2a2a'}`,
            color: msg.role === 'user' ? '#1D9E75' : '#aaa',
            fontFamily: 'DM Mono, monospace', fontSize: 12, lineHeight: 1.7
          }}>
            {msg.role === 'assistant' ? (
              <ReactMarkdown
                components={{
                  h2: ({children}) => <div style={{ color: '#f0ede8', fontWeight: 700, fontSize: 11, marginBottom: 8, marginTop: 12, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{children}</div>,
                  strong: ({children}) => <span style={{ color: '#f0ede8', fontWeight: 600 }}>{children}</span>,
                  p: ({children}) => <p style={{ margin: '4px 0', color: '#aaa' }}>{children}</p>,
                  ul: ({children}) => <ul style={{ paddingLeft: 16, margin: '4px 0', color: '#aaa' }}>{children}</ul>,
                  li: ({children}) => <li style={{ margin: '2px 0' }}>{children}</li>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            ) : msg.content}
          </div>
        </div>
      ))}
      {askLoading && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: '#0e0e0e', border: '0.5px solid #2a2a2a', color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
            thinking...
          </div>
        </div>
      )}
    </div>
  )}

  {/* Input */}
  <div style={{ display: 'flex', gap: 8 }}>
    <input
      value={question}
      onChange={e => setQuestion(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleAsk()}
      placeholder="Ask a follow-up question about your data..."
      style={{ flex: 1, background: '#0e0e0e', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f0ede8', fontFamily: 'Syne, sans-serif', fontSize: 14, outline: 'none' }}
    />
    <button
      onClick={handleAsk}
      disabled={askLoading}
      style={{ background: 'transparent', border: '0.5px solid #1D9E75', borderRadius: 8, padding: '10px 20px', color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 12, cursor: 'pointer' }}
    >
      {askLoading ? 'thinking...' : 'Ask Mirai ↗'}
    </button>
  </div>
</div>
          </>
        )}
        </>)}
      </div>
    </div>
  )
} 
 