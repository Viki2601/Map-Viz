import './globals.css'

export const metadata = {
  title: 'RouteViz — Algorithm Pathfinding Visualizer',
  description: 'Visualize DFS, BFS, Dijkstra & A* pathfinding algorithms on real city road networks in real-time. Interactive map-based algorithm education tool.',
  keywords: 'pathfinding, visualization, DFS, BFS, Dijkstra, A*, algorithm, map, routing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#060806" />
      </head>
      <body>{children}</body>
    </html>
  )
}