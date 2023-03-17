import React, {useState} from 'react'
import ReactDOM from 'react-dom/client';

function App() {
  return (
      <div><Child/></div>
  );
}

function Child() {
  const [n, setN] = useState(100);
  const list = n % 2 === 0 ? [
    <li key={1}>1</li>,
    <li key={2}>2</li>,
    <li key={3}>3</li>,
  ] : [
    <li key={3}>3</li>,
    <li key={2}>2</li>,
    <li key={1}>1</li>,
  ];
  const onClick = () => {
    setN(n => n + 1);
    setN(n => n + 1);
    setN(n => n + 1);
  }
  return (
      <ul onClick={onClick}>
        {n}
      </ul>
  );
}


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Child/>)
