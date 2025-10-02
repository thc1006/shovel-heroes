import React from 'react'
import { createRoot } from 'react-dom/client'

function App(){
  const [data,setData]=React.useState<any>(null);
  React.useEffect(()=>{
    fetch((import.meta as any).env.VITE_API_BASE + '/healthz')
      .then(r=>r.json()).then(setData).catch(e=>setData({error:String(e)}))
  },[])
  return <div style={{fontFamily:'system-ui',padding:16}}>
    <h1>Shovel Heroes</h1>
    <pre>{JSON.stringify(data,null,2)}</pre>
  </div>
}

createRoot(document.getElementById('root')!).render(<App/>)
