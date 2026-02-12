import { Card, CardContent } from "../shadcn/card"

interface Statistic {
  num: number
  label: string
}

function SummaryStatistics() {
  const statistics: [Statistic] = [
    {
      num: 10,
      label: "overdue"
    },
    {
      num: 5,
      label: "on loan"
    },
    {
      num: 1,
      label: "returned this month"
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-5 mb-5">
      {statistics.map(stat =>
        <Card className="p-5">
          <CardContent className="p-0">
            <h2 className="text-4xl font-medium">{stat.num}</h2>
            <p className="mt-2">{stat.label}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SummaryStatistics
