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

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', f)
      const res = await axios.post<Insight>(
        `${API}/query?question=Give me a full analysis of this dataset with key trends and recommendations`,
        form
      )
      setInsight(res.data)
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false
  })

  const handleAsk = async () => {
    if (!file || !question.trim()) return
    setAskLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post<Insight>(`${API}/query?question=${encodeURIComponent(question)}`, form)
      setInsight(res.data)
    } catch (e) { console.error(e) }
    setAskLoading(false)
    setQuestion('')
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
    {insight && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 4, padding: '3px 10px', color: '#888' }}>{insight.rows} rows · {insight.columns.length} cols</span>}
  </div>
</div>
      {page === 'explore' ? <Explore /> : (<>
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
            analyzing with mirai ai...
          </div>
        )}

        {insight && !loading && (
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
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder="Ask a follow-up question about your data..."
                style={{ flex: 1, background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f0ede8', fontFamily: 'Syne, sans-serif', fontSize: 14, outline: 'none' }}
              />
              <button
                onClick={handleAsk}
                disabled={askLoading}
                style={{ background: 'transparent', border: '0.5px solid #1D9E75', borderRadius: 8, padding: '10px 20px', color: '#1D9E75', fontFamily: 'DM Mono, monospace', fontSize: 12, cursor: 'pointer' }}
              >
                {askLoading ? 'thinking...' : 'Ask Mirai ↗'}
              </button>
            </div>
          </>
        )}
        </>)}
      </div>
    </div>
  )
} 
 