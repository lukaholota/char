import { CreatePersInput } from "./CreatePersInput.schema";
import { Pers } from "./Pers";

export class PersFactory {
    static create(_input: CreatePersInput): Pers {
        return null as any;
    }
}