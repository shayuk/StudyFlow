import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { Progress } from '../../components/ui/Progress.tsx';
import { ArrowRight } from 'lucide-react';

interface CourseCardProps {
  title: string;
  lecturer: string;
  progress: number;
}

export const CourseCard = ({ title, lecturer, progress }: CourseCardProps) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-text-secondary">{lecturer}</p>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center gap-x-2">
          <Progress value={progress} className="w-full" />
          <span className="text-sm font-medium text-text-secondary">{progress}%</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" size="sm">
          דוח התקדמות
        </Button>
        <Button size="sm">
          <span>כניסה לקורס</span>
          <ArrowRight className="mr-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
