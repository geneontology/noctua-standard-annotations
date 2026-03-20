import { NgModule } from '@angular/core';
import { NoctuaSharedModule } from '@noctua/shared.module';
import { NoctuaFormModule } from './noctua-form/noctua-form.module';
import { NoctuaSearchModule } from './noctua-search/noctua-search.module';
import { NoctuaAnnotationsModule } from './noctua-annotations/noctua-annotations.module';

@NgModule({
  imports: [
    NoctuaSharedModule,
    NoctuaFormModule,
    NoctuaSearchModule,
    NoctuaAnnotationsModule
  ],
  exports: [
    NoctuaFormModule,
    NoctuaFormModule,
    NoctuaSearchModule,
    NoctuaAnnotationsModule
  ],
  providers: [

  ],
  declarations: []

})

export class AppsModule {
}
