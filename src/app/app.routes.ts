import { Routes } from '@angular/router';
import { TdQuotesOverviewComponent } from './containers/td/td-quotes-overview/td-quotes-overview.component';

export const routes: Routes = [
	{
		path: 'td/quotes',
		component: TdQuotesOverviewComponent,
	},
	{
		path: '**',
		redirectTo: 'td/quotes',
	},
];
