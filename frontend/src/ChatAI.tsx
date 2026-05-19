import { useState } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Sparkles, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const API = import.meta.env.PROD ? 'https://miraibi-production.up.railway.app' : ''

interface ChatMessage {
  role: string
  content: string
  chartData?: any[]
  chartCols?: string[]
}

interface ChatAIProps {
  file: File | null
  modelYaml: string
  showChat: boolean
  onClose: () => void
  // Optional: only Explore needs these for query_update integration
  selectedFields?: string[]
  filters?: any[]
  calculations?: any[]
  onFieldsUpdate?: (fields: string[]) => void
  onFiltersUpdate?: (filters: any[]) => void
  context?: string // e.g. "dashboard", "explore", "builder"
}

const COLORS = ['#1D9E75', '#378ADD', '#BA7517', '#7F77DD', '#D85A30']

export default function ChatAI({
  file,
  modelYaml,
  showChat,
  onClose,
  selectedFields = [],
  filters = [],
  calculations = [],
  onFieldsUpdate,
  onFiltersUpdate,
  context = 'dashboard'
}: ChatAIProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const mdComponents = {
    h2: ({children}: any) => <div style={{ color: '#f0ede8', fontWeight: 700, fontSize: 11, marginBottom: 8, marginTop: 12, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{children}</div>,
    h3: ({children}: any) => <div style={{ color: '#f0ede8', fontWeight: 600, fontSize: 12, marginBottom: 6, marginTop: 10 }}>{children}</div>,
    strong: ({children}: any) => <span style={{ color: '#f0ede8', fontWeight: 600 }}>{children}</span>,
    p: ({children}: any) => <p style={{ margin: '4px 0', color: '#aaa', fontSize: 12 }}>{children}</p>,
    ul: ({children}: any) => <ul style={{ paddingLeft: 16, margin: '6px 0', color: '#aaa' }}>{children}</ul>,
    li: ({children}: any) => <li style={{ margin: '4px 0', fontSize: 12 }}>{children}</li>,
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
      form.append('context', context)
      const res = await axios.post(`${API}/explore/chat`, form)

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.reply,
      }

      // Only Explore reacts to query_update — other contexts just chat
      if (context === 'explore' && (res.data.new_fields || res.data.new_filters)) {
        const updatedFields = res.data.new_fields ?? selectedFields
        const updatedFilters = res.data.new_filters ?? filters
        if (onFieldsUpdate) onFieldsUpdate(updatedFields)
        if (onFiltersUpdate) onFiltersUpdate(updatedFilters)

        // Run query to get chart data for inline display
        const queryForm = new FormData()
        queryForm.append('file', file)
        queryForm.append('model_yaml', modelYaml)
        queryForm.append('selected_fields', JSON.stringify(updatedFields))
        queryForm.append('filters', JSON.stringify(updatedFilters))
        queryForm.append('calculations', JSON.stringify(calculations))
        const queryRes = await axios.post(`${API}/explore/query`, queryForm)
        assistantMsg.chartData = queryRes.data.data
        assistantMsg.chartCols = queryRes.data.columns
      }

      setChatMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      console.error(e)
    }
    setChatLoading(false)
  }

  const suggestions = context === 'explore'
    ? ['show me only march to july', 'which platform had the best roi?', 'what are the top trends?']
    : ['what are the top trends?', 'summarize this dataset', 'what surprises you about this data?']

  return (
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Context pill */}
      <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', marginBottom: 12, fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555' }}>
        context: {context}{file ? ` · ${file.name}` : ' · no data loaded'}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {chatMessages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 12, lineHeight: 1.7 }}>
              {file ? 'ask me anything about your data' : 'upload a csv to start chatting'}
            </p>
            {file && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setChatInput(suggestion)}
                    style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
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
          placeholder={file ? 'ask about your data...' : 'upload data first...'}
          disabled={!file}
          style={{ flex: 1, background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' }}
        />
        <button
          onClick={sendMessage}
          disabled={chatLoading || !file}
          style={{ background: 'rgba(55,138,221,0.15)', border: '0.5px solid #378ADD', borderRadius: 8, padding: '10px 14px', color: '#378ADD', fontFamily: 'DM Mono, monospace', fontSize: 12, cursor: 'pointer' }}
        >
          ↗
        </button>
      </div>
    </div>
  )
}