import { Card, CardContent } from "@/components/temp/card"

interface Statistic {
  num: number
  label: string
}

function SummaryStatistics() {
  const statistics: Statistic[] = [
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
    <div className="grid grid-cols-3 gap-4 mb-5">
      {statistics.map(stat =>
        <Card className="py-4 px-5">
          <CardContent className="p-0">
            <h2 className="text-3xl font-medium">{stat.num}</h2>
            <p className="text-sm mt-1">{stat.label}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SummaryStatistics
