import { AnnotationActivity } from "./../models/standard-annotation/annotation-activity"


export class DataGeneratorUtils {

  public static getCreateAnnotationsData(annotationActivities: AnnotationActivity[]) {
    const result = []
    annotationActivities.forEach((annotationActivity: AnnotationActivity) => {
      const annotation = [
        {
          target: 'gp',
          input: annotationActivity.gp.term.label,
          optionId: annotationActivity.gp.term.id
        },
        {
          target: 'goterm',
          input: annotationActivity.goterm.term.label,
          optionId: annotationActivity.goterm.term.id
        },
        {
          target: 'goterm-relation',
          optionId: annotationActivity.gpToTermEdge.label
        },
        {
          target: 'goterm-evidence-0',
          // input: annotationActivity.evidence.label,
          //optionId: annotationActivity.evidence.term.id
        },
        {
          target: 'goterm-reference-0',
          // input: annotationActivity.reference
        },
        {
          target: 'goterm-with-0',
          // input: annotationActivity.with
        }
      ]

      result.push(annotation)

    })

    return result

  }

  public static getDataJSON(data: any) {
    const jsonData = JSON.stringify(data, null, 2);

    // console.log(jsonData)

  }

  /*   public static saveToJsonFIle(data: any, filename: string) {
      const jsonData = JSON.stringify(data, null, 2);
  
      // Use writeFile function to save the data as a JSON file
      writeFile(filename, jsonData, 'utf8', (err) => {
        if (err) {
          console.error("An error occurred:", err);
          return;
        }
        console.log("File has been saved.");
      });
    } */
}