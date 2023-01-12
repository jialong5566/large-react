import React, {useState} from 'react'
import ReactDOM from 'react-dom/client';

function App() {
  return (
      <div><Child/></div>
  );
}

function Child() {
  const [n] = useState(12388)

  return <span>{n}</span>
}

const ele = <App a={5}/>;
console.log(ele)


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(ele)
