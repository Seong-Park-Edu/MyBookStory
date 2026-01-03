import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Chat({ session }) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [onlineUsers, setOnlineUsers] = useState(0);

    useEffect(() => {
        // 1. 기존 메시지 불러오기
        const fetchMessages = async () => {
            const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
            setMessages(data || [])
        }
        fetchMessages()

        // 2. 실시간 구독 설정 (핵심!)
        // 실시간 채널 설정 (Presence 기능 포함)
        const channel = supabase.channel('online-users', {
            config: { presence: { key: session.user.email } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                // 접속자 명단이 바뀔 때마다 실행
                const state = channel.presenceState();
                setOnlineUsers(Object.keys(state).length); // 접속 중인 고유 키(이메일) 개수 카운트
            })
            .on('presence', { event: 'join', key: session.user.email }, () => {
                console.log('새로운 사용자가 접속했습니다');
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // 내가 접속했음을 알림
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel)
        };
    }, [session])

    const sendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return
        await supabase.from('messages').insert([{ content: newMessage, user_email: session.user.email }])
        setNewMessage('')
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f5f5f5' }}>
            <div style={{ padding: '10px', backgroundColor: '#333', color: '#fff', fontSize: '13px', textAlign: 'center' }}>
                실시간 북토크 💬
            </div>
            <div style={{
                padding: '8px',
                backgroundColor: '#4caf50',
                color: '#fff',
                fontSize: '12px',
                textAlign: 'center',
                fontWeight: 'bold'
            }}>
                🟢 현재 {onlineUsers}명의 북러버가 접속 중
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {messages.map((m, i) => {
                    const isMe = m.user_email === session.user.email;
                    return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                            <small style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>{m.user_email.split('@')[0]}</small>
                            <div style={{
                                maxWidth: '80%',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                backgroundColor: isMe ? '#fee500' : '#fff', // 내꺼는 노란색(카톡), 남의꺼는 하얀색
                                color: '#333',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                {m.content}
                            </div>
                        </div>
                    );
                })}
            </div>
            <form onSubmit={sendMessage} style={{ display: 'flex', padding: '10px', backgroundColor: '#fff' }}>
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지 입력..." style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', padding: '5px 10px' }} />
                <button type="submit" style={{ marginLeft: '5px', border: 'none', backgroundColor: '#333', color: '#fff', borderRadius: '4px', padding: '5px 10px' }}>전송</button>
            </form>
        </div>
    );
}