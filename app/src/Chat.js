import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

export default function Chat({ session }) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [onlineUsers, setOnlineUsers] = useState(0);

    // 1. 스크롤 위치를 잡기 위한 참조(Ref) 생성
    const messagesEndRef = useRef(null);

    // 2. 메시지 목록이 바뀔 때마다 스크롤을 맨 아래로 내리는 함수
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // 메시지가 새로 추가될 때마다 실행
        scrollToBottom();
    }, [messages]);

    useEffect(() => {

        // 1. 기존 메시지 불러오기
        const fetchMessages = async () => {
            const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
            setMessages(data || []);
        };
        fetchMessages();

        // 2. 통합 채널 생성 (이름: 'room1')
        const channel = supabase.channel('room1', {
            config: { presence: { key: session.user.email } }
        });

        channel
            // [메시지 실시간 수신]
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                setMessages((prev) => [...prev, payload.new]);
            })
            // [접속자 수 실시간 동기화]
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setOnlineUsers(Object.keys(state).length);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // 내가 들어왔음을 추적 시작
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session]); // session이 바뀔 때만 재연결

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

            {/* 접속자 표시 헤더 */}
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

            {/* 메시지 출력창 */}
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
                {/* 3. 스크롤을 이동시킬 빈 태그(말표) 추가 */}
                <div ref={messagesEndRef} />
            </div>

            {/* 입력 폼 */}
            <form onSubmit={sendMessage} style={{ display: 'flex', padding: '10px', backgroundColor: '#fff' }}>
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지 입력..." style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', padding: '5px 10px' }} />
                <button type="submit" style={{ marginLeft: '5px', border: 'none', backgroundColor: '#333', color: '#fff', borderRadius: '4px', padding: '5px 10px' }}>전송</button>
            </form>
        </div>
    );
}