import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Chat({ session }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    // 1. 기존 메시지 불러오기
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
      setMessages(data || [])
    }
    fetchMessages()

    // 2. 실시간 구독 설정 (핵심!)
    const channel = supabase.channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]) // 새로운 메시지 오면 바로 추가
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    await supabase.from('messages').insert([{ content: newMessage, user_email: session.user.email }])
    setNewMessage('')
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '10px', marginTop: '20px' }}>
      <h3>💬 실시간 북 토크</h3>
      <div style={{ height: '200px', overflowY: 'auto', marginBottom: '10px', borderBottom: '1px solid #eee' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '5px' }}>
            <strong>{m.user_email.split('@')[0]}</strong>: {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요" style={{ width: '80%', padding: '8px' }} />
        <button type="submit" style={{ padding: '8px 15px' }}>전송</button>
      </form>
    </div>
  )
}