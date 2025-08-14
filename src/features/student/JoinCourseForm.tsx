
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export const JoinCourseForm = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>הצטרפות לקורס חדש</CardTitle>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="courseCode">קוד קורס</Label>
              <Input id="courseCode" placeholder="הזן את קוד הקורס" />
            </div>
          </div>
        </form>
      </CardContent>
      <CardContent>
        <Button className="w-full" variant="secondary">
          הצטרף לקורס
        </Button>
      </CardContent>
    </Card>
  );
}
