import Sidebar from './Sidebar'
import ChatAI from './ChatAI'
import CustomBuilder from './CustomBuilder'
import ReactMarkdown from 'react-markdown'
import Explore from './Explore'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Upload, Sparkles, TrendingUp } from 'lucide-react'

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
const [showChat, setShowChat] = useState(false)
const [exploreFields, setExploreFields] = useState<string[]>([])
const [exploreFilters, setExploreFilters] = useState<any[]>([])
const [exploreCalculations, setExploreCalculations] = useState<any[]>([])

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
  <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex' }}>
    <Sidebar
      page={page}
      setPage={setPage}
      mode={mode}
      setMode={setMode}
      file={file}
      onUpload={() => {/* upload handled by dropzone */}}
      onChatToggle={() => setShowChat(!showChat)}
      showChat={showChat}
    />
    <div style={{ flex: 1, marginLeft: 240, padding: '2rem 2rem', maxWidth: 1200 }}>

        
      {page === 'explore' ? (
  <Explore 
    sharedFile={file} 
    sharedModelYaml={modelYaml}
    onFileChange={(f, yaml) => { setFile(f); setModelYaml(yaml) }}
    selectedFields={exploreFields}
    filters={exploreFilters}
    calculations={exploreCalculations}
    onFieldsChange={setExploreFields}
    onFiltersChange={setExploreFilters}
    onCalculationsChange={setExploreCalculations}
  />
) : (<>
        {/* Upload */}
{!file && (
  <div style={{ marginTop: 48 }}>
    <div style={{ fontSize: 24, fontWeight: 600, color: '#f0ede8', letterSpacing: '-0.4px', marginBottom: 8 }}>
      Welcome to Mirai BI
    </div>
    <div style={{ fontSize: 14, color: '#888', marginBottom: 32 }}>
      Upload a CSV to start exploring your data with AI-powered insights.
    </div>
    <div {...getRootProps()} style={{
      border: `1px dashed ${isDragActive ? '#1D9E75' : '#2a2a2a'}`,
      borderRadius: 14,
      padding: '64px 32px',
      textAlign: 'center',
      background: isDragActive ? 'rgba(29,158,117,0.04)' : '#121212',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}>
      <input {...getInputProps()} />
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(29,158,117,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <Upload size={20} color="#1D9E75" />
      </div>
      <p style={{ color: '#f0ede8', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
        {isDragActive ? 'Drop your file here' : 'Drop a CSV or click to upload'}
      </p>
      <p style={{ color: '#666', fontSize: 13, margin: 0 }}>BigQuery and Snowflake connectors coming soon</p>
    </div>
  </div>
)}

{/* Mode selection */}
{file && !loading && mode === 'select' && (
  <div style={{ marginTop: 48, marginBottom: 32 }}>
    <div style={{ fontSize: 24, fontWeight: 600, color: '#f0ede8', letterSpacing: '-0.4px', marginBottom: 8 }}>
      How would you like to explore?
    </div>
    <div style={{ fontSize: 14, color: '#888', marginBottom: 32 }}>
      Choose between AI-generated insights or build your own dashboard from scratch.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div
        onClick={runAIAnalysis}
        style={{
          background: '#121212',
          border: '0.5px solid #2a2a2a',
          borderRadius: 14,
          padding: 28,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#1D9E75'
          e.currentTarget.style.background = 'rgba(29,158,117,0.03)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2a2a'
          e.currentTarget.style.background = '#121212'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(29,158,117,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="#1D9E75" />
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Recommended</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#f0ede8', marginBottom: 6, letterSpacing: '-0.2px' }}>AI insights</div>
        <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
          Let Mirai AI analyze your data and surface trends, highlights, and recommendations automatically.
        </p>
        <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
          {['Auto-generated charts', 'AI-written insights', 'Conversational follow-ups'].map(item => (
            <li key={item} style={{ color: '#c4c4c4', fontSize: 13, lineHeight: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: 4, background: '#1D9E75' }} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div
        onClick={() => setMode('custom')}
        style={{
          background: '#121212',
          border: '0.5px solid #2a2a2a',
          borderRadius: 14,
          padding: 28,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#378ADD'
          e.currentTarget.style.background = 'rgba(55,138,221,0.03)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2a2a'
          e.currentTarget.style.background = '#121212'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(55,138,221,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} color="#378ADD" />
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Power user</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#f0ede8', marginBottom: 6, letterSpacing: '-0.2px' }}>Build from scratch</div>
        <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
          Drag and drop widgets to create your own dashboard with full control over every chart.
        </p>
        <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
          {['Bar, line, pie, area charts', 'KPI cards, gauges, heatmaps', 'Per-widget configuration'].map(item => (
            <li key={item} style={{ color: '#c4c4c4', fontSize: 13, lineHeight: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: 4, background: '#378ADD' }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)}

{/* Custom dashboard placeholder */}
{file && !loading && mode === 'custom' && (
  <CustomBuilder file={file} modelYaml={modelYaml} chartData={chartData} />
)}

{insight && !loading && mode === 'ai' && (

          <>
            {/* AI Insights header */}
<div style={{ marginTop: 16, marginBottom: 32 }}>
  <div style={{ fontSize: 22, fontWeight: 600, color: '#f0ede8', letterSpacing: '-0.4px', marginBottom: 6 }}>
    AI insights
  </div>
  <div style={{ fontSize: 13, color: '#888' }}>
    Auto-generated dashboard for {file?.name}
  </div>
</div>

{/* Metric cards */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 24 }}>
  {[
    { label: 'Rows', value: insight.rows.toLocaleString(), color: '#1D9E75' },
    { label: 'Columns', value: insight.columns.length, color: '#378ADD' },
    { label: 'Numeric fields', value: numericCols.length, color: '#BA7517' },
    { label: 'AI status', value: 'Ready', color: '#7F77DD' },
  ].map((m, i) => (
    <div key={i} style={{
      background: '#121212',
      border: '0.5px solid #2a2a2a',
      borderRadius: 12,
      padding: '18px 20px',
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a3a3a' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 6, height: 6, borderRadius: 6, background: m.color }} />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{m.label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#f0ede8', letterSpacing: '-0.5px', fontFamily: 'Syne, sans-serif' }}>{m.value}</div>
    </div>
  ))}
</div>

           {/* Charts */}
{categoryCols.length >= 1 && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
    <div style={{
      background: '#121212',
      border: '0.5px solid #2a2a2a',
      borderRadius: 14,
      padding: 24,
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a3a3a' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a' }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#f0ede8', marginBottom: 4 }}>
          {numericCols.length >= 1 ? `${numericCols[0]} by ${categoryCols[0]}` : `${categoryCols[0]} distribution`}
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {numericCols.length >= 1 ? 'aggregated bar chart' : 'count distribution'}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={(numericCols.length >= 1 ? chartData.slice(0, 20) :
          Object.entries(chartData.reduce((acc: any, row) => {
            const key = row[categoryCols[0]] as string
            acc[key] = (acc[key] || 0) + 1
            return acc
          }, {})).map(([k, v]) => ({ [categoryCols[0]]: k, count: v as number }))
        ) as any}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis dataKey={categoryCols[0]} tick={{ fontSize: 10, fill: '#666', fontFamily: 'DM Mono' }} stroke="#2a2a2a" />
          <YAxis tick={{ fontSize: 10, fill: '#666', fontFamily: 'DM Mono' }} stroke="#2a2a2a" />
          <Tooltip contentStyle={{ background: '#181818', border: '0.5px solid #3a3a3a', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
          <Bar dataKey={numericCols.length >= 1 ? numericCols[0] : 'count'} fill="#1D9E75" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div style={{
      background: '#121212',
      border: '0.5px solid #2a2a2a',
      borderRadius: 14,
      padding: 24,
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a3a3a' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a' }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#f0ede8', marginBottom: 4 }}>
          Trends
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {numericCols.slice(0, 3).join(' · ') || 'no numeric fields'}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData.slice(0, 20)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis dataKey={categoryCols[0]} tick={{ fontSize: 10, fill: '#666', fontFamily: 'DM Mono' }} stroke="#2a2a2a" />
          <YAxis tick={{ fontSize: 10, fill: '#666', fontFamily: 'DM Mono' }} stroke="#2a2a2a" />
          <Tooltip contentStyle={{ background: '#181818', border: '0.5px solid #3a3a3a', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontFamily: 'DM Mono', fontSize: 10, color: '#888', paddingTop: 12 }} />
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

     <ChatAI
  file={file}
  modelYaml={modelYaml}
  showChat={showChat}
  onClose={() => setShowChat(false)}
  context={page === 'explore' ? 'explore' : mode === 'custom' ? 'builder' : 'dashboard'}
  selectedFields={exploreFields}
  filters={exploreFilters}
  calculations={exploreCalculations}
  onFieldsUpdate={setExploreFields}
  onFiltersUpdate={setExploreFilters}
/>
    </div>
  )
}  
