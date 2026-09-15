import { ApiProperty } from '@nestjs/swagger';

export class MasterOverviewDto {
  @ApiProperty() totalStores: number;
  @ApiProperty() activeStudents: number;
  @ApiProperty() publishedCourses: number;
  @ApiProperty() totalEnrollments: number;
  @ApiProperty() completedEnrollments: number;
  @ApiProperty() inProgressEnrollments: number;
  @ApiProperty() notStartedEnrollments: number;
  @ApiProperty() completionRate: number;
  @ApiProperty() overdueRequiredEnrollments: number;
  @ApiProperty({ nullable: true }) avgQuizScore: number | null;
}

export class StoreCompletionDto {
  @ApiProperty() storeId: string;
  @ApiProperty() storeName: string;
  @ApiProperty() storeCode: string;
  @ApiProperty() totalStudents: number;
  @ApiProperty() totalEnrollments: number;
  @ApiProperty() completedEnrollments: number;
  @ApiProperty() completionRate: number;
}

export class CourseCompletionDto {
  @ApiProperty() courseId: string;
  @ApiProperty() courseTitle: string;
  @ApiProperty() totalEnrollments: number;
  @ApiProperty() completedEnrollments: number;
  @ApiProperty() completionRate: number;
}

export class RecentUserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty() role: string;
  @ApiProperty() createdAt: Date;
}

export class MasterDashboardDto {
  @ApiProperty({ type: MasterOverviewDto }) overview: MasterOverviewDto;
  @ApiProperty({ type: [StoreCompletionDto] }) completionByStore: StoreCompletionDto[];
  @ApiProperty({ type: [CourseCompletionDto] }) completionByCourse: CourseCompletionDto[];
  @ApiProperty({ type: [RecentUserDto] }) recentRegistrations: RecentUserDto[];
}

export class StoreOverviewDto {
  @ApiProperty() totalStudents: number;
  @ApiProperty() activeStudents: number;
  @ApiProperty() inactiveStudents: number;
  @ApiProperty() availableCourses: number;
  @ApiProperty() requiredCourses: number;
  @ApiProperty() completedEnrollments: number;
  @ApiProperty() inProgressEnrollments: number;
  @ApiProperty() notStartedEnrollments: number;
  @ApiProperty() completionRate: number;
  @ApiProperty() passedAttempts: number;
  @ApiProperty() failedAttempts: number;
  @ApiProperty({ nullable: true }) avgQuizScore: number | null;
  @ApiProperty() studentsWithPendingRequired: number;
}

export class StoreCourseProgressDto {
  @ApiProperty() courseId: string;
  @ApiProperty() courseTitle: string;
  @ApiProperty() assignmentType: string;
  @ApiProperty() totalStudents: number;
  @ApiProperty() completed: number;
  @ApiProperty() inProgress: number;
  @ApiProperty() notStarted: number;
  @ApiProperty() completionRate: number;
}

export class StoreDashboardDto {
  @ApiProperty({ type: StoreOverviewDto }) overview: StoreOverviewDto;
  @ApiProperty({ type: [StoreCourseProgressDto] }) courseProgress: StoreCourseProgressDto[];
}
